import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";

const createAssignmentSchema = z.object({
  advertiserId: z.string(),
  managerId: z.string(),
});

// Super 관리자 권한 확인 헬퍼 함수
async function requireSuperAdmin() {
  const user = await requireRole("ADMIN");
  if (user.adminType !== "SUPER") {
    throw new Error("Super 관리자 권한이 필요합니다");
  }
  return user;
}

// POST /api/admin/advertiser-assignments - 광고주를 매니저에게 배정
export async function POST(request: NextRequest) {
  try {
    const user = await requireSuperAdmin();

    const body = await request.json();
    const { advertiserId, managerId } = createAssignmentSchema.parse(body);

    // 매니저 권한 확인
    const manager = await prisma.user.findUnique({
      where: { id: managerId },
      select: { role: true, adminType: true }
    });

    if (!manager || manager.role !== "ADMIN" || manager.adminType !== "MANAGER") {
      return NextResponse.json(
        { error: "유효하지 않은 매니저입니다" },
        { status: 400 }
      );
    }

    // 광고주 존재 확인
    const advertiser = await prisma.advertiserProfile.findUnique({
      where: { userId: advertiserId }
    });

    if (!advertiser) {
      return NextResponse.json(
        { error: "존재하지 않는 광고주입니다" },
        { status: 404 }
      );
    }

    // 중복 배정 확인
    const existing = await prisma.advertiserManager.findUnique({
      where: {
        advertiserId_managerId: { advertiserId: advertiser.id, managerId }
      }
    });

    if (existing) {
      return NextResponse.json(
        { error: "이미 배정된 관계입니다" },
        { status: 409 }
      );
    }

    // 배정 생성
    const assignment = await prisma.advertiserManager.create({
      data: {
        advertiserId: advertiser.id,
        managerId,
        assignedBy: user.id,
      },
      include: {
        advertiser: { include: { user: { select: { name: true, email: true } } } },
        manager: { select: { name: true, email: true } },
        assignedByUser: { select: { name: true } }
      }
    });

    return NextResponse.json(assignment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "유효하지 않은 입력입니다", details: error.errors },
        { status: 400 }
      );
    }

    console.error("광고주 배정 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// GET /api/admin/advertiser-assignments - 배정 목록 조회
export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    const assignments = await prisma.advertiserManager.findMany({
      where: { isActive: true },
      include: {
        advertiser: {
          include: {
            user: { select: { name: true, email: true } },
            places: { select: { id: true, name: true } }
          }
        },
        manager: { select: { name: true, email: true } },
        assignedByUser: { select: { name: true } }
      },
      orderBy: { assignedAt: "desc" },
      skip: offset,
      take: limit
    });

    const total = await prisma.advertiserManager.count({
      where: { isActive: true }
    });

    return NextResponse.json({
      assignments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("배정 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
