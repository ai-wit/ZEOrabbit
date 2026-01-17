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

export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin();

    // 슈퍼관리자의 경우 모든 캠페인 조회 가능
    // 매니저의 경우 담당 광고주의 캠페인만 조회 가능
    let where: any = {};

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
        return NextResponse.json({ campaigns: [] });
      }

      where.advertiserId = { in: allowedAdvertiserIds };
    }

    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        advertiser: {
          include: {
            user: { select: { name: true } }
          }
        },
        place: { select: { name: true } },
        productOrders: {
          take: 1,
          include: {
            product: {
              select: { name: true, missionType: true }
            }
          }
        },
        _count: {
          select: { missionDays: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    if (error instanceof Error && error.message.includes("권한")) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error("캠페인 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
