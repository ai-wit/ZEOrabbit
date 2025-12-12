import { z } from "zod";

export const MissionTypeSchema = z.enum(["TRAFFIC", "SAVE", "SHARE"]);
export type MissionType = z.infer<typeof MissionTypeSchema>;

export const PricingPolicySchema = z.object({
  rewardRatioByMissionType: z.record(MissionTypeSchema, z.number().min(0).max(1)),
  unitPriceMinKrwByMissionType: z.record(MissionTypeSchema, z.number().int().min(0)),
  unitPriceMaxKrwByMissionType: z.record(MissionTypeSchema, z.number().int().min(0))
});
export type PricingPolicy = z.infer<typeof PricingPolicySchema>;

export const MissionLimitsPolicySchema = z.object({
  timeoutMsByMissionType: z.record(MissionTypeSchema, z.number().int().min(1))
});
export type MissionLimitsPolicy = z.infer<typeof MissionLimitsPolicySchema>;

export const PayoutPolicySchema = z.object({
  minPayoutKrw: z.number().int().min(0)
});
export type PayoutPolicy = z.infer<typeof PayoutPolicySchema>;


