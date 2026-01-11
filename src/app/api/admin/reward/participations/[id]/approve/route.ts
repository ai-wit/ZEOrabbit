import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireManager } from "@/server/auth/require-manager";

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const manager = await requireManager();
  const participationId = ctx.params.id;

  try {
    await prisma.$transaction(async (tx) => {
      const p = await tx.participation.findUnique({
        where: { id: participationId },
        select: {
          id: true,
          status: true,
          rewarderId: true,
          missionDay: {
            select: {
              campaign: {
                select: {
                  advertiserId: true,
                  unitPriceKrw: true,
                  rewardKrw: true
                }
              }
            }
          }
        }
      });
      if (!p) throw new Error("Not found");
      if (p.status !== "PENDING_REVIEW" && p.status !== "MANUAL_REVIEW") throw new Error("Invalid status");

      const rel = await tx.advertiserManager.findFirst({
        where: { managerId: manager.id, advertiserId: p.missionDay.campaign.advertiserId, isActive: true },
        select: { id: true }
      });
      if (!rel) throw new Error("Forbidden");

      await tx.verificationResult.upsert({
        where: { participationId: p.id },
        update: {
          manualDecision: "APPROVE",
          decidedByAdminId: manager.id,
          decidedAt: new Date()
        },
        create: {
          participationId: p.id,
          manualDecision: "APPROVE",
          decidedByAdminId: manager.id,
          decidedAt: new Date()
        }
      });

      await tx.participation.update({
        where: { id: p.id },
        data: { status: "APPROVED", decidedAt: new Date(), failureReason: null }
      });

      await tx.budgetLedger.createMany({
        data: [
          {
            advertiserId: p.missionDay.campaign.advertiserId,
            amountKrw: -p.missionDay.campaign.unitPriceKrw,
            reason: "MISSION_APPROVED_CHARGE",
            refId: p.id
          }
        ],
        skipDuplicates: true
      });

      await tx.creditLedger.createMany({
        data: [
          {
            rewarderId: p.rewarderId,
            amountKrw: p.missionDay.campaign.rewardKrw,
            reason: "MISSION_REWARD",
            refId: p.id
          }
        ],
        skipDuplicates: true
      });

      await tx.auditLog.create({
        data: {
          actorUserId: manager.id,
          action: "MANAGER_APPROVE_PARTICIPATION",
          targetType: "Participation",
          targetId: p.id
        }
      });
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}


