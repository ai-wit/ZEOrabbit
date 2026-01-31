import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { getAdvertiserProfileIdByUserId } from "@/server/advertiser/advertiser-profile";
import { prisma } from "@/server/prisma";

const Schema = z.object({
  orderId: z.string().min(1), // paymentId (prd_*)
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("ADVERTISER");
    const advertiserId = await getAdvertiserProfileIdByUserId(user.id);
    const json = await req.json().catch(() => null);
    const parsed = Schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }

    const { orderId } = parsed.data;
    if (!orderId.startsWith("prd_")) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: orderId },
      select: { id: true, advertiserId: true, status: true },
    });
    if (!payment) {
      return NextResponse.json({ error: "notfound" }, { status: 404 });
    }
    if (payment.advertiserId !== advertiserId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      const order = await tx.productOrder.findFirst({
        where: { paymentId: payment.id },
        select: { id: true, status: true, pointsAppliedKrw: true, advertiserId: true },
      });

      if (payment.status !== "PAID" && payment.status !== "REFUNDED") {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: "CANCELED", updatedAt: new Date() },
        });
      }

      if (order && order.status !== "FULFILLED") {
        await tx.productOrder.update({
          where: { id: order.id },
          data: { status: "CANCELED" },
        });
      }

      if (order?.pointsAppliedKrw && order.pointsAppliedKrw > 0) {
        await tx.budgetLedger.createMany({
          data: [
            {
              advertiserId: order.advertiserId,
              amountKrw: order.pointsAppliedKrw,
              reason: "PRODUCT_ORDER_POINTS_REFUND",
              refId: order.id,
            },
          ],
          skipDuplicates: true,
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: "ADVERTISER_PRODUCT_ORDER_CANCELLED",
          targetType: "ProductOrder",
          targetId: order?.id ?? payment.id,
          payloadJson: { orderId: payment.id },
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Product order cancel error:", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

