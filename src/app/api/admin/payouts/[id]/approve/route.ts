import { NextResponse } from "next/server";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getBaseUrl } from "@/server/url-helpers";

export async function POST(req: Request, ctx: { params: { id: string } }) {

  const baseUrl = getBaseUrl(req);
  
  const admin = await requireRole("ADMIN");
  const payoutId = ctx.params.id;

  try {
    await prisma.$transaction(async (tx) => {
      const payout = await tx.payoutRequest.findUnique({
        where: { id: payoutId },
        select: { id: true, rewarderId: true, amountKrw: true, status: true }
      });
      if (!payout) throw new Error("Not found");
      if (payout.status !== "REQUESTED" && payout.status !== "APPROVED") throw new Error("Invalid status");

      // If already deducted, treat as idempotent.
      const already = await tx.creditLedger.findFirst({
        where: { reason: "PAYOUT", refId: payout.id },
        select: { id: true }
      });

      if (!already) {
        const agg = await tx.creditLedger.aggregate({
          where: { rewarderId: payout.rewarderId },
          _sum: { amountKrw: true }
        });
        const balance = agg._sum.amountKrw ?? 0;

        const pendingAgg = await tx.payoutRequest.aggregate({
          where: { rewarderId: payout.rewarderId, status: { in: ["REQUESTED", "APPROVED"] }, NOT: { id: payout.id } },
          _sum: { amountKrw: true }
        });
        const pending = pendingAgg._sum.amountKrw ?? 0;
        const available = balance - pending;

        if (available < payout.amountKrw) {
          await tx.payoutRequest.update({
            where: { id: payout.id },
            data: {
              status: "REJECTED",
              decidedAt: new Date(),
              failureReason: "Insufficient balance at approval time"
            }
          });
          await tx.auditLog.create({
            data: {
              actorUserId: admin.id,
              action: "ADMIN_REJECT_PAYOUT_INSUFFICIENT_BALANCE",
              targetType: "PayoutRequest",
              targetId: payout.id
            }
          });
          return;
        }

        // Deduct rewarder balance (idempotent via unique(reason, refId))
        await tx.creditLedger.createMany({
          data: [
            {
              rewarderId: payout.rewarderId,
              amountKrw: -payout.amountKrw,
              reason: "PAYOUT",
              refId: payout.id
            }
          ],
          skipDuplicates: true
        });
      }

      await tx.payoutRequest.update({
        where: { id: payout.id },
        data: {
          status: "PAID",
          decidedAt: new Date(),
          failureReason: null
        }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          action: "ADMIN_APPROVE_PAYOUT",
          targetType: "PayoutRequest",
          targetId: payout.id
        }
      });
    });
  } catch {
    return NextResponse.redirect(new URL(`/admin/payouts/${payoutId}`, baseUrl), 303);
  }

  return NextResponse.redirect(new URL(`/admin/payouts/${payoutId}`, baseUrl), 303);
}


