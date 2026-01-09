import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { getAdvertiserProfileIdByUserId } from "@/server/advertiser/advertiser-profile";
import { prisma } from "@/server/prisma";
import { confirmTossPayment } from "@/server/toss-payments";
import { getPricingPolicy } from "@/server/policy/get-policy";
import { calculateRewardKrw } from "@/server/advertiser/pricing";
import { eachDateUtcInclusive, toDateOnlyUtc } from "@/server/date/date-only";

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

    if (payment.status !== "PAID") {
      // In development, we skip Toss confirmation.
      if (process.env.NODE_ENV !== "development") {
        if (!paymentKey) {
          return NextResponse.json({ error: "Missing paymentKey" }, { status: 400 });
        }

        const tossResponse = await confirmTossPayment({ paymentKey, orderId, amount });
        if (tossResponse.status !== "DONE") {
          return NextResponse.json(
            { error: "Payment not completed", status: tossResponse.status },
            { status: 400 }
          );
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

      let campaignId = order.campaignId;
      if (!campaignId) {
        const totalDays = daysInclusive(order.startDate, order.endDate);
        const budgetTotalKrw = order.dailyTarget * totalDays * order.unitPriceKrw;

        const campaign = await tx.campaign.create({
          data: {
            advertiserId,
            placeId: order.placeId,
            name: `${order.product.name}`,
            missionType: order.product.missionType,
            dailyTarget: order.dailyTarget,
            startDate: order.startDate,
            endDate: order.endDate,
            unitPriceKrw: order.unitPriceKrw,
            rewardKrw,
            budgetTotalKrw,
            status: "ACTIVE",
          },
          select: { id: true, startDate: true, endDate: true, dailyTarget: true },
        });

        for (const date of eachDateUtcInclusive(campaign.startDate, campaign.endDate)) {
          const dateOnly = toDateOnlyUtc(date);
          await tx.missionDay.upsert({
            where: { campaignId_date: { campaignId: campaign.id, date: dateOnly } },
            update: { status: "ACTIVE" },
            create: {
              campaignId: campaign.id,
              date: dateOnly,
              quotaTotal: campaign.dailyTarget,
              quotaRemaining: campaign.dailyTarget,
              status: "ACTIVE",
            },
          });
        }

        campaignId = campaign.id;

        await tx.productOrder.update({
          where: { id: order.id },
          data: { campaignId, status: "FULFILLED" },
        });
      } else {
        await tx.productOrder.update({
          where: { id: order.id },
          data: { status: "FULFILLED" },
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: "ADVERTISER_PRODUCT_ORDER_FULFILLED",
          targetType: "ProductOrder",
          targetId: order.id,
          payloadJson: { paymentId: payment.id, campaignId },
        },
      });

      return { campaignId };
    });

    return NextResponse.json({
      success: true,
      order: { id: order.id, status: "FULFILLED" },
      campaign: { id: fulfilled.campaignId },
    });
  } catch (error) {
    console.error("Product order confirmation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

