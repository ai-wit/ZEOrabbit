import { NextResponse } from "next/server";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const admin = await requireRole("ADMIN");
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

      await tx.verificationResult.upsert({
        where: { participationId: p.id },
        update: {
          manualDecision: "APPROVE",
          decidedByAdminId: admin.id,
          decidedAt: new Date()
        },
        create: {
          participationId: p.id,
          manualDecision: "APPROVE",
          decidedByAdminId: admin.id,
          decidedAt: new Date()
        }
      });

      await tx.participation.update({
        where: { id: p.id },
        data: { status: "APPROVED", decidedAt: new Date(), failureReason: null }
      });

      // Ledger (idempotent via unique(reason, refId))
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
          actorUserId: admin.id,
          action: "ADMIN_APPROVE_PARTICIPATION",
          targetType: "Participation",
          targetId: p.id
        }
      });
    });
  } catch {
    return NextResponse.redirect(new URL(`/admin/reviews/${participationId}`, req.url), 303);
  }

  return NextResponse.redirect(new URL(`/admin/reviews/${participationId}`, req.url), 303);
}


