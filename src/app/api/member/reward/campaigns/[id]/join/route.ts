import { NextResponse } from "next/server";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getMemberProfileIdByUserId } from "@/server/rewarder/rewarder-profile";
import { getMissionTimeoutMs } from "@/server/member/policy";
import { toDateOnlyUtc } from "@/server/date/date-only";
import { getClientIp } from "@/server/security/ip";
import { isIpBlocked } from "@/server/security/blacklist";
import { getBaseUrl } from "@/server/url-helpers";

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const baseUrl = getBaseUrl(req);
  
  if (await isIpBlocked(getClientIp(req.headers))) {
    return NextResponse.redirect(new URL("/member/reward/campaigns", baseUrl), 303);
  }

  const user = await requireRole("MEMBER");
  const rewarderId = await getMemberProfileIdByUserId(user.id);
  const campaignId = ctx.params.id;
  const today = toDateOnlyUtc(new Date());

  try {
    const participation = await prisma.$transaction(async (tx) => {
      const mission = await tx.missionDay.findFirst({
        where: {
          date: today,
          status: "ACTIVE",
          campaign: {
            id: campaignId,
            status: "ACTIVE",
            startDate: { lte: today },
            endDate: { gte: today }
          }
        },
        select: {
          id: true,
          quotaRemaining: true,
          campaign: { select: { missionType: true } }
        }
      });
      if (!mission) throw new Error("Mission not found");
      if (mission.quotaRemaining <= 0) throw new Error("Sold out");

      const existing = await tx.participation.findFirst({
        where: {
          rewarderId,
          missionDayId: mission.id,
          status: { in: ["IN_PROGRESS", "PENDING_REVIEW", "MANUAL_REVIEW"] }
        },
        select: { id: true }
      });
      if (existing) return { id: existing.id };

      const updated = await tx.missionDay.updateMany({
        where: { id: mission.id, quotaRemaining: { gt: 0 } },
        data: { quotaRemaining: { decrement: 1 } }
      });
      if (updated.count !== 1) throw new Error("Sold out");

      const expiresAt = new Date(Date.now() + (await getMissionTimeoutMs(mission.campaign.missionType)));
      const created = await tx.participation.create({
        data: {
          missionDayId: mission.id,
          rewarderId,
          status: "IN_PROGRESS",
          expiresAt
        },
        select: { id: true }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: "MISSION_CLAIMED",
          targetType: "Participation",
          targetId: created.id
        }
      });

      return created;
    });

    return NextResponse.redirect(new URL(`/member/reward/participations/${participation.id}`, baseUrl), 303);
  } catch {
    return NextResponse.redirect(new URL("/member/reward/campaigns", baseUrl), 303);
  }
}


