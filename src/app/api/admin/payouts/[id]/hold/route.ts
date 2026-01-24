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
        select: { id: true, status: true }
      });
      if (!payout) throw new Error("Not found");
      if (payout.status !== "REQUESTED") throw new Error("Invalid status");

      await tx.payoutRequest.update({
        where: { id: payout.id },
        data: { status: "APPROVED", decidedAt: new Date(), failureReason: null }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          action: "ADMIN_HOLD_PAYOUT",
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


