import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getAdvertiserProfileIdByUserId } from "@/server/advertiser/advertiser-profile";

// 광고주 권한 확인 헬퍼 함수
async function requireAdvertiser() {
  const user = await requireRole("ADVERTISER");
  const advertiserId = await getAdvertiserProfileIdByUserId(user.id);
  return { user, advertiserId };
}

// GET /api/advertiser/experience/campaigns/[campaignId]/report - 리포트 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  try {
    const { advertiserId } = await requireAdvertiser();
    const campaignId = params.campaignId;

    // 체험단 공고 존재 및 권한 확인
    const campaign = await prisma.experienceCampaign.findFirst({
      where: {
        id: campaignId,
        advertiserId
      },
      include: {
        report: {
          include: {
            generator: { select: { name: true } },
            reviewer: { select: { name: true } }
          }
        }
      }
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "체험단 공고에 대한 권한이 없습니다" },
        { status: 403 }
      );
    }

    if (!campaign.report) {
      return NextResponse.json(
        { error: "아직 리포트가 생성되지 않았습니다" },
        { status: 404 }
      );
    }

    if (campaign.report.status !== "APPROVED") {
      return NextResponse.json(
        { error: "승인된 리포트만 확인할 수 있습니다" },
        { status: 403 }
      );
    }

    return NextResponse.json({ report: campaign.report });
  } catch (error) {
    console.error("리포트 조회 실패:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
