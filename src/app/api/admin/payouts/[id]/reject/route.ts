import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getBaseUrl } from "@/server/url-helpers";

const Schema = z.object({
  reason: z.string().min(1).max(200)
});

export async function POST(req: Request, ctx: { params: { id: string } }) {

  const baseUrl = getBaseUrl(req);
  
  const admin = await requireRole("ADMIN");
  const payoutId = ctx.params.id;

  const form = await req.formData();
  const parsed = Schema.safeParse({ reason: form.get("reason") });
  if (!parsed.success) {
    return NextResponse.redirect(new URL(`/admin/payouts/${payoutId}`, baseUrl), 303);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const payout = await tx.payoutRequest.findUnique({
        where: { id: payoutId },
        select: { id: true, status: true }
      });
      if (!payout) throw new Error("Not found");
      if (payout.status !== "REQUESTED" && payout.status !== "APPROVED") throw new Error("Invalid status");

      await tx.payoutRequest.update({
        where: { id: payout.id },
        data: {
          status: "REJECTED",
          decidedAt: new Date(),
          failureReason: parsed.data.reason
        }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          action: "ADMIN_REJECT_PAYOUT",
          targetType: "PayoutRequest",
          targetId: payout.id,
          payloadJson: { reason: parsed.data.reason }
        }
      });
    });
  } catch {
    return NextResponse.redirect(new URL(`/admin/payouts/${payoutId}`, baseUrl), 303);
  }

  return NextResponse.redirect(new URL(`/admin/payouts/${payoutId}`, baseUrl), 303);
}


