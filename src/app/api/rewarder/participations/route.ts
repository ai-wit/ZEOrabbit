import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getMemberProfileIdByUserId } from "@/server/member/member-profile";
import { getMissionTimeoutMs } from "@/server/rewarder/policy";
import { getClientIp } from "@/server/security/ip";
import { isIpBlocked } from "@/server/security/blacklist";
import { getBaseUrl } from "@/server/url-helpers";

const ClaimSchema = z.object({
  missionDayId: z.string().min(1)
});

export async function POST(req: Request) {

  const baseUrl = getBaseUrl(req);
  
  if (await isIpBlocked(getClientIp(req.headers))) {
    return NextResponse.redirect(new URL("/rewarder/missions", baseUrl), 303);
  }

  const user = await requireRole("MEMBER");
  const memberId = await getMemberProfileIdByUserId(user.id);

  const form = await req.formData();
  const parsed = ClaimSchema.safeParse({
    missionDayId: form.get("missionDayId")
  });
  if (!parsed.success) {
    return NextResponse.redirect(new URL("/rewarder/missions", baseUrl), 303);
  }

  const missionDayId = parsed.data.missionDayId;

  try {
    const participation = await prisma.$transaction(async (tx) => {
      const mission = await tx.missionDay.findFirst({
        where: {
          id: missionDayId,
          status: "ACTIVE",
          campaign: { status: "ACTIVE" }
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
          rewarderId: memberId,
          missionDayId,
          status: { in: ["IN_PROGRESS", "PENDING_REVIEW", "MANUAL_REVIEW"] }
        },
        select: { id: true }
      });
      if (existing) return { id: existing.id };

      const updated = await tx.missionDay.updateMany({
        where: { id: missionDayId, quotaRemaining: { gt: 0 } },
        data: { quotaRemaining: { decrement: 1 } }
      });
      if (updated.count !== 1) throw new Error("Sold out");

      const expiresAt = new Date(Date.now() + (await getMissionTimeoutMs(mission.campaign.missionType)));
      const created = await tx.participation.create({
        data: {
          missionDayId,
          rewarderId: memberId,
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

    return NextResponse.redirect(
      new URL(`/member/participations/${participation.id}`, baseUrl),
      303
    );
  } catch {
    return NextResponse.redirect(new URL("/member/missions", baseUrl), 303);
  }
}


