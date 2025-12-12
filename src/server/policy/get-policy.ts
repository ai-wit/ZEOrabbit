import { prisma } from "@/server/prisma";
import {
  MissionLimitsPolicySchema,
  type MissionLimitsPolicy,
  PayoutPolicySchema,
  type PayoutPolicy,
  PricingPolicySchema,
  type PricingPolicy
} from "@/server/policy/types";

async function getActivePolicyPayload(key: "PRICING" | "MISSION_LIMITS" | "PAYOUT") {
  const policy = await prisma.policy.findFirst({
    where: { key, isActive: true },
    orderBy: { createdAt: "desc" },
    select: { payloadJson: true }
  });
  return policy?.payloadJson ?? null;
}

export async function getPricingPolicy(): Promise<PricingPolicy | null> {
  const payload = await getActivePolicyPayload("PRICING");
  if (!payload) return null;
  const parsed = PricingPolicySchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

export async function getMissionLimitsPolicy(): Promise<MissionLimitsPolicy | null> {
  const payload = await getActivePolicyPayload("MISSION_LIMITS");
  if (!payload) return null;
  const parsed = MissionLimitsPolicySchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

export async function getPayoutPolicy(): Promise<PayoutPolicy | null> {
  const payload = await getActivePolicyPayload("PAYOUT");
  if (!payload) return null;
  const parsed = PayoutPolicySchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}


