import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { getAdvertiserProfileIdByUserId } from "@/server/advertiser/advertiser-profile";
import { prisma } from "@/server/prisma";

const Schema = z.object({
  productId: z.string().min(1),
  placeId: z.string().min(1),
  startDate: z.string().min(10).max(10), // YYYY-MM-DD
  endDate: z.string().min(10).max(10),
  dailyTarget: z.coerce.number().int().min(1).max(1_000_000),
  paymentMethod: z.enum(["DEV", "TOSS"]),
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

export async function POST(req: Request) {
  const user = await requireRole("ADVERTISER");

  // 매니저는 상품 구매 불가
  if (user.adminType === "MANAGER") {
    return NextResponse.redirect(new URL(`/advertiser/products?error=managerNotAllowed`, req.url), 303);
  }

  const advertiserId = await getAdvertiserProfileIdByUserId(user.id);

  const form = await req.formData();
  const parsed = Schema.safeParse({
    productId: form.get("productId"),
    placeId: form.get("placeId"),
    startDate: form.get("startDate"),
    endDate: form.get("endDate"),
    dailyTarget: form.get("dailyTarget"),
    paymentMethod: form.get("paymentMethod"),
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL(`/advertiser/products?error=invalid`, req.url), 303);
  }

  const start = parseDateInput(parsed.data.startDate);
  const end = parseDateInput(parsed.data.endDate);
  if (!start || !end || start.getTime() > end.getTime()) {
    return NextResponse.redirect(new URL(`/advertiser/products/${parsed.data.productId}?error=date`, req.url), 303);
  }

  const [product, place] = await Promise.all([
    prisma.product.findFirst({
      where: { id: parsed.data.productId, isActive: true },
      select: { id: true, name: true, missionType: true, unitPriceKrw: true, vatPercent: true, minOrderDays: true },
    }),
    prisma.place.findFirst({
      where: { id: parsed.data.placeId, advertiserId },
      select: { id: true, name: true },
    }),
  ]);

  if (!product || !place) {
    return NextResponse.redirect(new URL(`/advertiser/products/${parsed.data.productId}?error=notfound`, req.url), 303);
  }

  const totalDays = daysInclusive(start, end);
  if (totalDays < product.minOrderDays) {
    return NextResponse.redirect(new URL(`/advertiser/products/${product.id}?error=minDays`, req.url), 303);
  }

  const totalQty = parsed.data.dailyTarget * totalDays;
  const budgetTotalKrw = totalQty * product.unitPriceKrw;
  const vatAmountKrw = Math.round((budgetTotalKrw * product.vatPercent) / 100);
  const totalAmountKrw = budgetTotalKrw + vatAmountKrw;

  const paymentMethod = parsed.data.paymentMethod;

  // Create order + payment atomically.
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
        status: "CREATED",
      },
      select: { id: true },
    });

    const paymentId = `prd_${order.id}`;

    if (paymentMethod === "DEV") {
      const providerRef = `dev_${crypto.randomUUID()}`;

      await tx.payment.create({
        data: {
          id: paymentId,
          advertiserId,
          amountKrw: totalAmountKrw,
          status: "PAID",
          provider: "DEV",
          providerRef,
        },
      });

      await tx.productOrder.update({
        where: { id: order.id },
        data: { paymentId, status: "PAID" },
      });
    } else {
      await tx.payment.create({
        data: {
          id: paymentId,
          advertiserId,
          amountKrw: totalAmountKrw,
          status: "CREATED",
          provider: "TOSS",
          providerRef: paymentId,
        },
      });

      await tx.productOrder.update({
        where: { id: order.id },
        data: { paymentId },
      });
    }

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
          paymentMethod,
        },
      },
    });

    return { orderId: order.id, paymentId, totalAmountKrw };
  });

  // DEV payments: redirect to Toss success page to reuse the same confirmation UX.
  if (paymentMethod === "DEV") {
    const successUrl = new URL("/advertiser/billing/toss/success", req.url);
    successUrl.searchParams.set("orderId", created.paymentId);
    successUrl.searchParams.set("paymentKey", `dev_payment_${Date.now()}`);
    successUrl.searchParams.set("amount", String(created.totalAmountKrw));
    return NextResponse.redirect(successUrl, 303);
  }

  const paymentUrl = new URL("/advertiser/billing/toss", req.url);
  paymentUrl.searchParams.set("orderId", created.paymentId);
  paymentUrl.searchParams.set("amount", created.totalAmountKrw.toString());
  paymentUrl.searchParams.set("orderName", `${product.name} (${place.name})`);
  return NextResponse.redirect(paymentUrl, 303);
}

