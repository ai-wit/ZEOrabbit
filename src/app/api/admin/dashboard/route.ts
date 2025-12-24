import { NextResponse } from "next/server";
import { requireRole } from "@/server/auth/require-user";

export async function GET() {
  const user = await requireRole("ADMIN");

  // 간단한 테스트 데이터 반환
  return NextResponse.json({
    user,
    userTotal: 10,
    userAdvertisers: 3,
    userRewarders: 6,
    userAdmins: 1,
    campaignsActive: 5,
    campaignsDraft: 2,
    campaignsPaused: 1,
    pendingReviews: 8,
    pendingManual: 3,
    payoutsRequested: 4,
    payoutsApproved: 2,
    payoutRequestedSum: 200000,
    payoutApprovedSum: 100000,
    missionDaysToday: 3,
    quotaTotal: 150,
    quotaRemaining: 120,
    auditLogs: [
      {
        id: "test-audit-1",
        action: "LOGIN",
        targetType: "USER",
        targetId: "user-1",
        createdAt: new Date().toISOString()
      }
    ],
    reviewQueueItems: [
      {
        id: "test-review-1",
        status: "PENDING_REVIEW",
        submittedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        rewarder: { user: { email: "test@example.com" }, id: "rewarder-1" },
        missionDay: { campaign: { place: { name: "테스트 플레이스" }, missionType: "TRAFFIC" } }
      }
    ],
    payoutQueueItems: [
      {
        id: "test-payout-1",
        status: "REQUESTED",
        amountKrw: 50000,
        createdAt: new Date().toISOString(),
        rewarder: { user: { email: "test@example.com" }, id: "rewarder-1" }
      }
    ],
    decidedTodayApproved: 12,
    decidedTodayRejected: 3,
    reviewQueueTotal: 11,
    payoutQueueTotal: 6,
    approvedSeries: [8, 5, 12, 7, 9, 6, 11],
    rejectedSeries: [2, 1, 3, 2, 1, 2, 1],
    requestedSeries: [3, 1, 4, 2, 3, 2, 4],
    approvedPayoutSeries: [2, 1, 2, 1, 2, 1, 1]
  });
}
