import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";

// 매니저 권한 확인 헬퍼 함수
async function requireManager() {
  const user = await requireRole("ADMIN");
  if (user.adminType !== "MANAGER") {
    throw new Error("매니저 권한이 필요합니다");
  }
  return user;
}

// GET /api/admin/experience-applications/[id] - 체험단 신청 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireManager();

    const application = await prisma.experienceApplication.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        businessName: true,
        placeType: true,
        address: true,
        advertiserId: true,
        advertiser: {
          include: {
            user: { select: { name: true, email: true } }
          }
        },
        pricingPlan: {
          select: { name: true, displayName: true, priceKrw: true, description: true }
        },
        payment: {
          select: { id: true, status: true, amountKrw: true, provider: true, createdAt: true }
        }
      }
    });

    if (!application) {
      return NextResponse.json(
        { error: "존재하지 않는 체험단 신청입니다" },
        { status: 404 }
      );
    }

    // 매니저 권한 확인 - 담당 광고주인지 확인
    const assignment = await prisma.advertiserManager.findFirst({
      where: {
        advertiserId: application.advertiserId,
        managerId: user.id,
        isActive: true
      }
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "접근 권한이 없습니다" },
        { status: 403 }
      );
    }

    return NextResponse.json({ application });
  } catch (error) {
    if (error instanceof Error && error.message.includes("권한")) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error("체험단 신청 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
