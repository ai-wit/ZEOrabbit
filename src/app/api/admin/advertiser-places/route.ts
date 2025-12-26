import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";

const getAdvertiserPlacesSchema = z.object({
  advertiserId: z.string(),
});

// 매니저 권한 확인 헬퍼 함수
async function requireManager() {
  const user = await requireRole("ADMIN");
  if (user.adminType !== "MANAGER") {
    throw new Error("매니저 권한이 필요합니다");
  }
  return user;
}

// POST /api/admin/advertiser-places - 광고주의 장소 목록 조회
export async function POST(request: NextRequest) {
  try {
    const user = await requireManager();

    const body = await request.json();
    const data = getAdvertiserPlacesSchema.parse(body);

    // 광고주 배정 확인
    const assignment = await prisma.advertiserManager.findFirst({
      where: {
        advertiserId: data.advertiserId,
        managerId: user.id,
        isActive: true
      }
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "배정되지 않은 광고주의 장소를 조회할 수 없습니다" },
        { status: 403 }
      );
    }

    // 광고주의 장소 목록 조회
    const places = await prisma.place.findMany({
      where: { advertiserId: data.advertiserId },
      select: {
        id: true,
        name: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ places });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "유효하지 않은 입력입니다", details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes("권한")) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error("광고주 장소 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
