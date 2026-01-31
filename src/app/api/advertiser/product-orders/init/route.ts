import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { getAdvertiserProfileIdByUserId } from "@/server/advertiser/advertiser-profile";
import { getAdvertiserBudgetBalanceKrw } from "@/server/advertiser/balance";
import { prisma } from "@/server/prisma";
import { getPricingPolicy } from "@/server/policy/get-policy";
import { calculateRewardKrw } from "@/server/advertiser/pricing";
import { calculateProductOrderAmounts, clampPointsApplied } from "@/server/advertiser/product-order-points";

const Schema = z.object({
  productId: z.string().min(1),
  placeId: z.string().min(1),
  startDate: z.string().min(10).max(10), // YYYY-MM-DD
  endDate: z.string().min(10).max(10),
  dailyTarget: z.coerce.number().int().min(1).max(1_000_000),
  paymentMethod: z.enum(["DEV", "TOSS"]),
  pointsAppliedKrw: z.coerce.number().int().min(0).optional(),
});

function parseDateInput(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function daysInclusive(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("ADVERTISER");
    const advertiserId = await getAdvertiserProfileIdByUserId(user.id);
    if (user.adminType === "MANAGER") {
      return NextResponse.json({ error: "managerNotAllowed" }, { status: 403 });
    }

    const json = await req.json().catch(() => null);
    const parsed = Schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }

    const start = parseDateInput(parsed.data.startDate);
    const end = parseDateInput(parsed.data.endDate);
    if (!start || !end || start.getTime() > end.getTime()) {
      return NextResponse.json({ error: "date" }, { status: 400 });
    }

    const [product, place, balanceKrw] = await Promise.all([
      prisma.product.findFirst({
        where: { id: parsed.data.productId, isActive: true },
        select: { id: true, name: true, missionType: true, unitPriceKrw: true, vatPercent: true, minOrderDays: true },
      }),
      prisma.place.findFirst({
        where: { id: parsed.data.placeId, advertiserId },
        select: { id: true, name: true },
      }),
      getAdvertiserBudgetBalanceKrw(advertiserId),
    ]);

    if (!product || !place) {
      return NextResponse.json({ error: "notfound" }, { status: 404 });
    }

    const totalDays = daysInclusive(start, end);
    if (totalDays < product.minOrderDays) {
      return NextResponse.json({ error: "minDays" }, { status: 400 });
    }

    const { budgetTotalKrw, vatAmountKrw, totalAmountKrw } = calculateProductOrderAmounts({
      unitPriceKrw: product.unitPriceKrw,
      vatPercent: product.vatPercent,
      totalDays,
      dailyTarget: parsed.data.dailyTarget,
    });

    const requestedPoints = parsed.data.pointsAppliedKrw ?? 0;
    const { pointsAppliedKrw, maxPointsKrw } = clampPointsApplied({
      requestedPointsKrw: requestedPoints,
      balanceKrw,
      totalAmountKrw,
    });
    if (requestedPoints > maxPointsKrw) {
      return NextResponse.json({ error: "pointsExceeded", maxPoints: maxPointsKrw }, { status: 400 });
    }
    const payableAmountKrw = Math.max(0, totalAmountKrw - pointsAppliedKrw);

    const paymentMethod = parsed.data.paymentMethod;

    const created = await prisma.$transaction(async (tx) => {
      const order = await tx.productOrder.create({
        data: {
          advertiserId,
          productId: product.id,
          placeId: place.id,
          startDate: start,
          endDate: end,
          dailyTarget: parsed.data.dailyTarget,
          unitPriceKrw: product.unitPriceKrw,
          budgetTotalKrw,
          vatAmountKrw,
          totalAmountKrw,
          pointsAppliedKrw,
          payableAmountKrw,
          status: "CREATED",
        },
        select: { id: true },
      });

      const paymentId = `prd_${order.id}`;
      const providerRef = paymentMethod === "DEV" ? `dev_${crypto.randomUUID()}` : paymentId;
      const provider = paymentMethod === "DEV" ? "DEV" : "TOSS";

      if (pointsAppliedKrw > 0) {
        await tx.budgetLedger.createMany({
          data: [
            {
              advertiserId,
              amountKrw: -pointsAppliedKrw,
              reason: "PRODUCT_ORDER_POINTS_BURN",
              refId: order.id,
            },
          ],
          skipDuplicates: true,
        });
      }

      const shouldMarkPaid = payableAmountKrw === 0 || paymentMethod === "DEV";

      await tx.payment.create({
        data: {
          id: paymentId,
          advertiserId,
          amountKrw: payableAmountKrw,
          status: shouldMarkPaid ? "PAID" : "CREATED",
          provider: payableAmountKrw === 0 ? "POINTS" : provider,
          providerRef,
        },
      });

      await tx.productOrder.update({
        where: { id: order.id },
        data: { paymentId, status: shouldMarkPaid ? "PAID" : "CREATED" },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: "ADVERTISER_PRODUCT_ORDER_CREATED",
          targetType: "ProductOrder",
          targetId: order.id,
          payloadJson: {
            productId: product.id,
            placeId: place.id,
            startDate: parsed.data.startDate,
            endDate: parsed.data.endDate,
            dailyTarget: parsed.data.dailyTarget,
            totalDays,
            budgetTotalKrw,
            vatAmountKrw,
            totalAmountKrw,
            pointsAppliedKrw,
            payableAmountKrw,
            paymentMethod,
          },
        },
      });

      if (payableAmountKrw === 0) {
        const pricing = await getPricingPolicy();
        const rewardRatio =
          pricing?.rewardRatioByMissionType?.[product.missionType] ??
          (product.missionType === "TRAFFIC" ? 0.25 : 0.25);
        const rewardKrw = calculateRewardKrw({ unitPriceKrw: product.unitPriceKrw, rewardRatio });

        await tx.payment.update({
          where: { id: paymentId },
          data: { status: "PAID", updatedAt: new Date() },
        });

        await tx.productOrder.update({
          where: { id: order.id },
          data: { status: "FULFILLED" },
        });

        await tx.budgetLedger.createMany({
          data: [
            {
              advertiserId,
              amountKrw: budgetTotalKrw,
              reason: "PRODUCT_ORDER_CREDIT",
              refId: order.id,
            },
            {
              advertiserId,
              amountKrw: -budgetTotalKrw,
              reason: "PRODUCT_ORDER_BURN",
              refId: order.id,
            },
          ],
          skipDuplicates: true,
        });

        await tx.auditLog.create({
          data: {
            actorUserId: user.id,
            action: "ADVERTISER_PRODUCT_ORDER_FULFILLED",
            targetType: "ProductOrder",
            targetId: order.id,
            payloadJson: { paymentId, rewardKrwSuggested: rewardKrw, pointsAppliedKrw },
          },
        });
      }

      return { orderId: order.id, paymentId };
    });

    if (payableAmountKrw === 0) {
      const params = new URLSearchParams({
        orderId: `prd_${created.orderId}`,
        amount: "0",
        pointsOnly: "1",
        productId: product.id,
      });
      return NextResponse.json({ redirectUrl: `/advertiser/billing/toss/success?${params.toString()}` });
    }

    if (paymentMethod === "DEV") {
      const params = new URLSearchParams({
        productId: product.id,
        orderId: `prd_${created.orderId}`,
        paymentKey: `dev_payment_${Date.now()}`,
        amount: payableAmountKrw.toString(),
      });
      return NextResponse.json({ redirectUrl: `/advertiser/billing/toss/success?${params.toString()}` });
    }

    const paymentUrl = new URLSearchParams({
      orderId: `prd_${created.orderId}`,
      amount: payableAmountKrw.toString(),
      orderName: `${product.name} (${place.name})`,
      productId: product.id,
    });
    return NextResponse.json({ redirectUrl: `/advertiser/billing/toss?${paymentUrl.toString()}` });
  } catch (error) {
    console.error("Product order init error:", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

