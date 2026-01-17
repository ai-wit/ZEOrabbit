import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/prisma";

// 관리자 권한 확인 헬퍼 함수
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    throw new Error("관리자 권한이 필요합니다");
  }
  if (!user.adminType || !["SUPER", "MANAGER"].includes(user.adminType)) {
    throw new Error("관리자 권한이 필요합니다");
  }
  return user;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin();
    const campaignId = params.id;

    // 슈퍼관리자의 경우 모든 캠페인 조회 가능
    // 매니저의 경우 담당 광고주의 캠페인만 조회 가능
    let where: any = { id: campaignId };

    if (user.adminType === "MANAGER") {
      // 매니저의 담당 광고주 목록 조회
      const managedAdvertisers = await prisma.advertiserManager.findMany({
        where: {
          managerId: user.id,
          isActive: true
        },
        select: {
          advertiserId: true
        }
      });

      const allowedAdvertiserIds = managedAdvertisers.map(am => am.advertiserId);

      if (allowedAdvertiserIds.length === 0) {
        return NextResponse.json(
          { error: "접근 권한이 없습니다." },
          { status: 403 }
        );
      }

      where.advertiserId = { in: allowedAdvertiserIds };
    }

    const campaign = await prisma.campaign.findFirst({
      where,
      include: {
        advertiser: {
          include: {
            user: { select: { name: true, email: true } }
          }
        },
        place: { select: { name: true } },
        productOrders: {
          take: 1,
          include: {
            product: {
              select: { name: true, missionType: true, marketingCopy: true }
            }
          }
        },
        _count: {
          select: { missionDays: true }
        }
      }
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "캠페인을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    if (error instanceof Error && error.message.includes("권한")) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error("캠페인 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
