import { NextResponse } from "next/server";
import { requireRole } from "@/server/auth/require-user";

export async function GET() {
  const user = await requireRole("REWARDER");

  // 간단한 테스트 데이터 반환
  return NextResponse.json({
    user,
    balance: 150000,
    available: 120000,
    pendingPayoutCount: 2,
    pendingPayoutSum: 30000,
    payoutsRecent: [
      {
        id: "test-payout-1",
        amountKrw: 50000,
        status: "REQUESTED",
        createdAt: new Date().toISOString(),
        failureReason: null
      }
    ],
    ledgersRecent: [
      {
        id: "test-ledger-1",
        amountKrw: 1000,
        reason: "MISSION_REWARD",
        refId: "participation-1",
        createdAt: new Date().toISOString()
      }
    ],
    missionsToday: [
      {
        id: "test-mission-1",
        quotaRemaining: 80,
        quotaTotal: 100,
        campaign: { missionType: "TRAFFIC", rewardKrw: 1000, place: { name: "테스트 플레이스" } }
      }
    ],
    activeMyParticipation: [
      { id: "participation-1", missionDayId: "test-mission-1", status: "IN_PROGRESS" }
    ],
    participationsTodayCount: 1,
    participationSeries: [1, 0, 2, 1, 0, 1, 1],
    approvedSeries: [1, 0, 1, 1, 0, 1, 0],
    rejectedSeries: [0, 0, 1, 0, 0, 0, 0],
    earnedSeries: [1000, 0, 2000, 1000, 0, 1000, 1000],
    earnedSum7d: 6000,
    participatedDays7d: 5,
    streak: 3
  });
}
