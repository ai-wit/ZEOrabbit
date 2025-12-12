import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getRewarderProfileIdByUserId } from "@/server/rewarder/rewarder-profile";
import { maskAccountNumber } from "@/server/rewarder/mask";

const Schema = z.object({
  bankName: z.string().min(1).max(100),
  accountNumber: z.string().min(4).max(64),
  accountHolderName: z.string().max(100).optional()
});

export async function POST(req: Request) {
  const user = await requireRole("REWARDER");
  const rewarderId = await getRewarderProfileIdByUserId(user.id);

  const form = await req.formData();
  const parsed = Schema.safeParse({
    bankName: form.get("bankName"),
    accountNumber: form.get("accountNumber"),
    accountHolderName: (form.get("accountHolderName") || undefined) as string | undefined
  });
  if (!parsed.success) {
    return NextResponse.redirect(new URL("/rewarder/payouts/account", req.url), 303);
  }

  const masked = maskAccountNumber(parsed.data.accountNumber);

  await prisma.$transaction(async (tx) => {
    await tx.payoutAccount.updateMany({
      where: { rewarderId },
      data: { isPrimary: false }
    });
    await tx.payoutAccount.create({
      data: {
        rewarderId,
        bankName: parsed.data.bankName,
        accountNumberMasked: masked,
        accountHolderName: parsed.data.accountHolderName || null,
        isPrimary: true
      }
    });
    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "PAYOUT_ACCOUNT_SET_PRIMARY",
        targetType: "RewarderProfile",
        targetId: rewarderId
      }
    });
  });

  return NextResponse.redirect(new URL("/rewarder/payouts", req.url), 303);
}


