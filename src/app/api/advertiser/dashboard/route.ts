import { NextResponse } from "next/server";
import { requireRole } from "@/server/auth/require-user";

export async function GET() {
  const user = await requireRole("ADVERTISER");

  // 간단한 테스트 데이터 반환
  return NextResponse.json({
    user,
    budgetBalance: 100000,
    placesCount: 2,
    campaignsActive: 1,
    campaignsDraft: 1,
    campaignsPaused: 0,
    campaignsEnded: 0,
    missionDaysToday: 1,
    quotaTotal: 100,
    quotaRemaining: 80,
    reviewQueueTotal: 5,
    spendToday: 15000,
    topupToday: 50000,
    approvedSeries: [5, 3, 8, 2, 6, 4, 7],
    rejectedSeries: [1, 2, 1, 3, 1, 2, 1],
    spendSeries: [10000, 15000, 8000, 12000, 18000, 9000, 15000],
    topupSeries: [0, 0, 50000, 0, 0, 0, 0],
    spendLast7d: 88000,
    approvedLast7d: 36,
    rejectedLast7d: 11,
    recentCampaigns: [
      {
        id: "test-campaign-1",
        name: "테스트 캠페인",
        status: "ACTIVE",
        missionType: "TRAFFIC",
        dailyTarget: 100,
        unitPriceKrw: 100,
        rewardKrw: 100,
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        place: { name: "테스트 플레이스" }
      }
    ],
    recentLedgers: [
      {
        id: "test-ledger-1",
        createdAt: new Date().toISOString(),
        reason: "TOPUP",
        amountKrw: 50000,
        refId: null
      }
    ]
  });
}
