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

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();
    const body = await request.json();
    const { where, page = 1, pageSize = 10 } = body;

    // 슈퍼관리자의 경우 모든 체험단 신청 조회 가능
    // 매니저의 경우 담당 광고주의 체험단 신청만 조회 가능
    let finalWhere: any = where || {};

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

      // 이미 advertiserId 필터가 있는 경우 교집합 적용
      if (finalWhere.advertiserId) {
        if (finalWhere.advertiserId.in) {
          finalWhere.advertiserId.in = finalWhere.advertiserId.in.filter((id: string) =>
            allowedAdvertiserIds.includes(id)
          );
        } else {
          finalWhere.advertiserId = {
            ...finalWhere.advertiserId,
            in: allowedAdvertiserIds
          };
        }
      } else {
        finalWhere.advertiserId = { in: allowedAdvertiserIds };
      }
    }

    const [applications, totalCount] = await Promise.all([
      prisma.experienceApplication.findMany({
        where: finalWhere,
        include: {
          pricingPlan: {
            select: { name: true, displayName: true, priceKrw: true }
          },
          advertiser: {
            include: {
              user: { select: { name: true } }
            }
          },
          payment: {
            select: { id: true, status: true, amountKrw: true, provider: true }
          }
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.experienceApplication.count({ where: finalWhere })
    ]);

    return NextResponse.json({
      applications,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize)
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("권한")) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error("체험단 신청 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
