import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { getAdvertiserProfileIdByUserId } from "@/server/advertiser/advertiser-profile";
import { prisma } from "@/server/prisma";
import { confirmTossPayment } from "@/server/toss-payments";
import { getPricingPolicy } from "@/server/policy/get-policy";
import { calculateRewardKrw } from "@/server/advertiser/pricing";

const Schema = z.object({
  paymentKey: z.string().min(1).optional(),
  orderId: z.string().min(1), // paymentId
  amount: z.coerce.number().int().min(1),
});

function daysInclusive(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("ADVERTISER");
    const advertiserId = await getAdvertiserProfileIdByUserId(user.id);
    const json = await req.json().catch(() => null);
    const parsed = Schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    const { paymentKey, orderId, amount } = parsed.data;

    if (!orderId.startsWith("prd_")) {
      return NextResponse.json({ error: "Invalid payment type" }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: orderId },
      select: { id: true, advertiserId: true, amountKrw: true, status: true, provider: true, providerRef: true },
    });
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    if (payment.advertiserId !== advertiserId) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    if (payment.amountKrw !== amount) return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });

    const order = await prisma.productOrder.findFirst({
      where: { paymentId: orderId, advertiserId },
      select: {
        id: true,
        status: true,
        product: { select: { id: true, name: true, missionType: true, unitPriceKrw: true } },
        placeId: true,
        startDate: true,
        endDate: true,
        dailyTarget: true,
        unitPriceKrw: true,
        budgetTotalKrw: true,
        campaignId: true,
      },
    });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // If payment is already marked as PAID (via webhook), accept it
    if (payment.status !== "PAID") {
      // If paymentKey is provided, verify with Toss (skip in development)
      if (paymentKey && process.env.NODE_ENV !== "development") {
        const tossResponse = await confirmTossPayment({ paymentKey, orderId, amount });
        if (tossResponse.status !== "DONE") {
          return NextResponse.json(
            { error: "Payment not completed", status: tossResponse.status },
            { status: 400 }
          );
        }
      } else if (paymentKey && process.env.NODE_ENV === "development") {
        // In development, mark payment as PAID for test paymentKeys
        console.log('Development mode: marking payment as PAID for paymentKey:', paymentKey);
      } else {
        // In development, allow confirmation without paymentKey
        // In production, this might happen if webhook arrives after success redirect
        if (process.env.NODE_ENV !== "development") {
          // Wait a bit and check again in case webhook just arrived
          await new Promise(resolve => setTimeout(resolve, 1000));
          const updatedPayment = await prisma.payment.findUnique({
            where: { id: orderId },
            select: { status: true },
          });
          if (!updatedPayment || updatedPayment.status !== "PAID") {
            return NextResponse.json({ error: "Missing paymentKey and payment not confirmed" }, { status: 400 });
          }
        }
      }
    }

    const pricing = await getPricingPolicy();
    const rewardRatio =
      pricing?.rewardRatioByMissionType?.[order.product.missionType] ??
      (order.product.missionType === "TRAFFIC" ? 0.25 : 0.25);
    const rewardKrw = calculateRewardKrw({ unitPriceKrw: order.unitPriceKrw, rewardRatio });

    const fulfilled = await prisma.$transaction(async (tx) => {
      // Payment (idempotent)
      if (payment.status !== "PAID") {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "PAID",
            providerRef: paymentKey ?? payment.providerRef,
            updatedAt: new Date(),
          },
        });
      } else if (process.env.NODE_ENV === "development" && paymentKey && payment.providerRef !== paymentKey) {
        // In development, update providerRef if it's a test paymentKey
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            providerRef: paymentKey,
            updatedAt: new Date(),
          },
        });
      }

      // Order status (idempotent)
      await tx.productOrder.update({
        where: { id: order.id },
        data: {
          status: order.status === "FULFILLED" ? "FULFILLED" : "PAID",
        },
      });

      // Credit + burn (idempotent by unique(reason, refId))
      await tx.budgetLedger.createMany({
        data: [
          {
            advertiserId,
            amountKrw: order.budgetTotalKrw,
            reason: "PRODUCT_ORDER_CREDIT",
            refId: order.id,
          },
          {
            advertiserId,
            amountKrw: -order.budgetTotalKrw,
            reason: "PRODUCT_ORDER_BURN",
            refId: order.id,
          },
        ],
        skipDuplicates: true,
      });

      // NOTE: 캠페인은 결제 확정 시 자동 생성하지 않습니다.
      // 매니저가 구매 상품을 캠페인으로 '등록'한 후 활성화/비활성화를 관리합니다.
      await tx.productOrder.update({
        where: { id: order.id },
        data: { status: "FULFILLED" }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: "ADVERTISER_PRODUCT_ORDER_FULFILLED",
          targetType: "ProductOrder",
          targetId: order.id,
          payloadJson: { paymentId: payment.id, rewardKrwSuggested: rewardKrw },
        },
      });

      return { ok: true };
    });

    return NextResponse.json({
      success: true,
      order: { id: order.id, status: "FULFILLED" },
      campaign: null
    });
  } catch (error) {
    console.error("Product order confirmation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

