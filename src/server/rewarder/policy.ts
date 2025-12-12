import { getMissionLimitsPolicy } from "@/server/policy/get-policy";
import type { MissionType } from "@/server/policy/types";

export async function getMissionTimeoutMs(missionType: MissionType): Promise<number> {
  const policy = await getMissionLimitsPolicy();
  const fallback =
    missionType === "TRAFFIC"
      ? 3 * 60 * 1000
      : missionType === "SAVE"
        ? 5 * 60 * 1000
        : 2 * 60 * 1000;
  return policy?.timeoutMsByMissionType?.[missionType] ?? fallback;
}


