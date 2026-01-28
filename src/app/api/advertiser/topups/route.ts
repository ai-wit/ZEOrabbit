import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getAdvertiserProfileIdByUserId } from "@/server/advertiser/advertiser-profile";
import { getBaseUrl } from "@/server/url-helpers";

const Schema = z.object({
  amountKrw: z.coerce.number().int().min(1000).max(100_000_000),
  paymentMethod: z.enum(["DEV", "TOSS"])
});

export async function POST(req: Request) {
  const baseUrl = getBaseUrl(req);
  const user = await requireRole("ADVERTISER");
  const advertiserId = await getAdvertiserProfileIdByUserId(user.id);

  const form = await req.formData();

  const parsed = Schema.safeParse({
    amountKrw: form.get("amountKrw"),
    paymentMethod: form.get("paymentMethod")
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL("/advertiser/billing", baseUrl), 303);
  }

  const { amountKrw, paymentMethod } = parsed.data;
  const isDev = process.env.NODE_ENV === "development";

  if (paymentMethod === "DEV" && !isDev) {
    return NextResponse.redirect(new URL("/advertiser/billing?error=dev_payment_disabled", baseUrl), 303);
  }

  if (paymentMethod === "DEV") {
    // 기존 DEV 즉시 결제 로직
    const providerRef = `dev_${crypto.randomUUID()}`;

    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          advertiserId,
          amountKrw,
          status: "PAID",
          provider: "DEV",
          providerRef
        },
        select: { id: true }
      });

      await tx.budgetLedger.create({
        data: {
          advertiserId,
          amountKrw,
          reason: "TOPUP",
          refId: payment.id
        }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: "ADVERTISER_TOPUP_DEV",
          targetType: "Payment",
          targetId: payment.id,
          payloadJson: { amountKrw }
        }
      });
    });

    return NextResponse.redirect(new URL("/advertiser/billing", baseUrl), 303);

  } else if (paymentMethod === "TOSS") {
    // 토스페이먼츠 결제 로직
    try {
      // Create payment record first
      const orderId = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

      await prisma.payment.create({
        data: {
          id: orderId,
          advertiserId,
          amountKrw,
          status: "CREATED",
          provider: "TOSS",
          providerRef: orderId, // Will be updated with actual paymentKey after confirmation
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          actorUserId: user.id,
          action: "ADVERTISER_TOPUP_TOSS_INIT",
          targetType: "Payment",
          targetId: orderId,
          payloadJson: { amountKrw, paymentMethod: "TOSS" }
        }
      });

      // Redirect to Toss payment page with payment parameters
      const paymentUrl = new URL("/advertiser/billing/toss", baseUrl);
      paymentUrl.searchParams.set("orderId", orderId);
      paymentUrl.searchParams.set("amount", amountKrw.toString());
      paymentUrl.searchParams.set("orderName", `${amountKrw.toLocaleString("ko-KR")}원 충전`);

      return NextResponse.redirect(paymentUrl, 303);

    } catch (error) {
      console.error("Toss payment initialization error:", error);
      return NextResponse.redirect(new URL("/advertiser/billing?error=toss_init_failed", baseUrl), 303);
    }
  }

  // Fallback
  return NextResponse.redirect(new URL("/advertiser/billing", baseUrl), 303);
}


