import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getRewarderProfileIdByUserId } from "@/server/rewarder/rewarder-profile";
import { getRewarderAvailableBalanceKrw } from "@/server/rewarder/balance";
import { getPayoutPolicy } from "@/server/policy/get-policy";
import { getClientIp } from "@/server/security/ip";
import { isIpBlocked } from "@/server/security/blacklist";

const Schema = z.object({
  payoutAccountId: z.string().min(1),
  amountKrw: z.coerce.number().int().min(1).max(10_000_000)
});

export async function POST(req: Request) {
  if (await isIpBlocked(getClientIp(req.headers))) {
    return NextResponse.redirect(new URL("/rewarder/payouts", req.url), 303);
  }

  const user = await requireRole("REWARDER");
  const rewarderId = await getRewarderProfileIdByUserId(user.id);

  const form = await req.formData();
  const parsed = Schema.safeParse({
    payoutAccountId: form.get("payoutAccountId"),
    amountKrw: form.get("amountKrw")
  });
  if (!parsed.success) {
    return NextResponse.redirect(new URL("/rewarder/payouts", req.url), 303);
  }

  const account = await prisma.payoutAccount.findFirst({
    where: { id: parsed.data.payoutAccountId, rewarderId, isPrimary: true },
    select: { id: true }
  });
  if (!account) {
    return NextResponse.redirect(new URL("/rewarder/payouts", req.url), 303);
  }

  const payoutPolicy = await getPayoutPolicy();
  const minPayoutKrw = payoutPolicy?.minPayoutKrw ?? 1000;
  if (parsed.data.amountKrw < minPayoutKrw) {
    return NextResponse.redirect(new URL("/rewarder/payouts", req.url), 303);
  }

  const available = await getRewarderAvailableBalanceKrw(rewarderId);
  if (available < parsed.data.amountKrw) {
    return NextResponse.redirect(new URL("/rewarder/payouts", req.url), 303);
  }

  await prisma.$transaction(async (tx) => {
    await tx.payoutRequest.create({
      data: {
        rewarderId,
        payoutAccountId: account.id,
        amountKrw: parsed.data.amountKrw,
        status: "REQUESTED"
      }
    });
    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "PAYOUT_REQUESTED",
        targetType: "RewarderProfile",
        targetId: rewarderId,
        payloadJson: { amountKrw: parsed.data.amountKrw }
      }
    });
  });

  return NextResponse.redirect(new URL("/rewarder/payouts", req.url), 303);
}


