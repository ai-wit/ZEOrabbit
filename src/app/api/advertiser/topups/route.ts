import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getAdvertiserProfileIdByUserId } from "@/server/advertiser/advertiser-profile";

const Schema = z.object({
  amountKrw: z.coerce.number().int().min(1000).max(100_000_000)
});

export async function POST(req: Request) {
  const user = await requireRole("ADVERTISER");
  const advertiserId = await getAdvertiserProfileIdByUserId(user.id);

  const form = await req.formData();
  const parsed = Schema.safeParse({
    amountKrw: form.get("amountKrw")
  });
  if (!parsed.success) {
    return NextResponse.redirect(new URL("/advertiser/billing", req.url), 303);
  }

  const providerRef = `dev_${crypto.randomUUID()}`;

  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        advertiserId,
        amountKrw: parsed.data.amountKrw,
        status: "PAID",
        provider: "DEV",
        providerRef
      },
      select: { id: true }
    });

    await tx.budgetLedger.create({
      data: {
        advertiserId,
        amountKrw: parsed.data.amountKrw,
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
        payloadJson: { amountKrw: parsed.data.amountKrw }
      }
    });
  });

  return NextResponse.redirect(new URL("/advertiser/billing", req.url), 303);
}


