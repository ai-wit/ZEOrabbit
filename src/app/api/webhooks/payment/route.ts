import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";

const BodySchema = z.object({
  providerRef: z.string().min(1),
  status: z.enum(["PAID", "FAILED", "CANCELED", "REFUNDED"])
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const { providerRef, status } = parsed.data;

  const payment = await prisma.payment.findFirst({
    where: { providerRef },
    select: { id: true, advertiserId: true, amountKrw: true, status: true }
  });
  if (!payment) return NextResponse.json({ ok: false }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: { status }
    });

    if (status === "PAID") {
      await tx.budgetLedger.createMany({
        data: [
          {
            advertiserId: payment.advertiserId,
            amountKrw: payment.amountKrw,
            reason: "TOPUP",
            refId: payment.id
          }
        ],
        skipDuplicates: true
      });
    }

    await tx.auditLog.create({
      data: {
        actorUserId: null,
        action: "PAYMENT_WEBHOOK",
        targetType: "Payment",
        targetId: payment.id,
        payloadJson: { status }
      }
    });
  });

  return NextResponse.json({ ok: true });
}


