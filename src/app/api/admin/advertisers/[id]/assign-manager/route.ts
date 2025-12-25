import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";

const assignManagerSchema = z.object({
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

// POST /api/admin/advertisers/[id]/assign-manager - 매니저 할당
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const superAdmin = await requireSuperAdmin();

    const body = await request.json();
    const { managerId } = assignManagerSchema.parse(body);

    // 광고주 존재 확인
    const advertiser = await prisma.advertiserProfile.findUnique({
      where: { userId: params.id }
    });

    if (!advertiser) {
      return NextResponse.json(
        { error: "존재하지 않는 광고주입니다" },
        { status: 404 }
      );
    }

    // 매니저 존재 및 권한 확인
    const manager = await prisma.user.findFirst({
      where: {
        id: managerId,
        role: "ADMIN",
        adminType: "MANAGER"
      }
    });

    if (!manager) {
      return NextResponse.json(
        { error: "유효하지 않은 매니저입니다" },
        { status: 400 }
      );
    }

    // 이미 할당된 관계가 있는지 확인
    const existingAssignment = await prisma.advertiserManager.findFirst({
      where: {
        advertiserId: advertiser.id,
        managerId,
        isActive: true
      }
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: "이미 할당된 매니저입니다" },
        { status: 409 }
      );
    }

    // 기존 활성 배정을 비활성화 (하나의 광고주에 하나의 매니저만 할당)
    await prisma.advertiserManager.updateMany({
      where: {
        advertiserId: advertiser.id,
        isActive: true
      },
      data: { isActive: false }
    });

    // 새로운 배정 생성
    const assignment = await prisma.advertiserManager.create({
      data: {
        advertiserId: advertiser.id,
        managerId,
        assignedBy: superAdmin.id,
      },
      include: {
        advertiser: {
          include: {
            user: { select: { name: true } }
          }
        },
        manager: { select: { name: true, email: true } },
        assignedByUser: { select: { name: true } }
      }
    });

    return NextResponse.json({
      message: "매니저가 성공적으로 할당되었습니다",
      assignment: {
        id: assignment.id,
        advertiserName: assignment.advertiser.user.name,
        managerName: assignment.manager.name,
        managerEmail: assignment.manager.email,
        assignedBy: assignment.assignedByUser.name,
        assignedAt: assignment.assignedAt
      }
    });
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

    console.error("매니저 할당 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/advertisers/[id]/assign-manager - 매니저 할당 해제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(request.url);
    const managerId = searchParams.get("managerId");

    if (!managerId) {
      return NextResponse.json(
        { error: "managerId 파라미터가 필요합니다" },
        { status: 400 }
      );
    }

    // 광고주 존재 확인
    const advertiser = await prisma.advertiserProfile.findUnique({
      where: { userId: params.id }
    });

    if (!advertiser) {
      return NextResponse.json(
        { error: "존재하지 않는 광고주입니다" },
        { status: 404 }
      );
    }

    // 활성 배정 찾기
    const assignment = await prisma.advertiserManager.findFirst({
      where: {
        advertiserId: advertiser.id,
        managerId,
        isActive: true
      }
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "할당되지 않은 매니저입니다" },
        { status: 404 }
      );
    }

    // 배정 비활성화
    await prisma.advertiserManager.update({
      where: { id: assignment.id },
      data: { isActive: false }
    });

    return NextResponse.json({
      message: "매니저 할당이 성공적으로 해제되었습니다"
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("권한")) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error("매니저 할당 해제 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
