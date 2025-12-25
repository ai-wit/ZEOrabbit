import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { hash } from "bcryptjs";

const updateManagerSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
});

// Super 관리자 권한 확인 헬퍼 함수
async function requireSuperAdmin() {
  const user = await requireRole("ADMIN");
  if (user.adminType !== "SUPER") {
    throw new Error("Super 관리자 권한이 필요합니다");
  }
  return user;
}

// GET /api/admin/managers/[id] - 매니저 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin();

    const manager = await prisma.user.findFirst({
      where: {
        id: params.id,
        role: "ADMIN",
        adminType: "MANAGER"
      }
    });

    if (!manager) {
      return NextResponse.json(
        { error: "존재하지 않는 매니저입니다" },
        { status: 404 }
      );
    }

    // 할당된 광고주 목록 조회
    const assignments = await prisma.advertiserManager.findMany({
      where: {
        managerId: params.id,
        isActive: true
      },
      include: {
        advertiser: {
          include: {
            user: { select: { name: true, email: true } },
            places: { select: { id: true, name: true } },
            campaigns: { select: { id: true, name: true } }
          }
        }
      }
    });

    const advertisers = assignments.map(a => a.advertiser);

    return NextResponse.json({
      manager: {
        id: manager.id,
        email: manager.email,
        name: manager.name,
        status: manager.status,
        createdAt: manager.createdAt,
        updatedAt: manager.updatedAt
      },
      advertisers,
      assignmentCount: advertisers.length
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("권한")) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error("매니저 상세 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/managers/[id] - 매니저 정보 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin();

    const body = await request.json();
    const updateData = updateManagerSchema.parse(body);

    // 매니저 존재 및 권한 확인
    const existingManager = await prisma.user.findFirst({
      where: {
        id: params.id,
        role: "ADMIN",
        adminType: "MANAGER"
      }
    });

    if (!existingManager) {
      return NextResponse.json(
        { error: "존재하지 않는 매니저입니다" },
        { status: 404 }
      );
    }

    // 이메일 중복 확인 (이메일 변경 시)
    if (updateData.email && updateData.email !== existingManager.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: updateData.email }
      });

      if (emailExists) {
        return NextResponse.json(
          { error: "이미 사용 중인 이메일입니다" },
          { status: 409 }
        );
      }
    }

    // 트랜잭션으로 업데이트
    const result = await prisma.$transaction(async (tx) => {
      // 사용자 정보 업데이트
      const updatedUser = await tx.user.update({
        where: { id: params.id },
        data: {
          ...(updateData.name && { name: updateData.name }),
          ...(updateData.email && { email: updateData.email })
        }
      });

      // 비밀번호 변경 시
      if (updateData.password) {
        const passwordHash = await hash(updateData.password, 12);
        await tx.authCredential.update({
          where: { userId: params.id },
          data: { passwordHash }
        });
      }

      return updatedUser;
    });

    return NextResponse.json({
      message: "매니저 정보가 성공적으로 수정되었습니다",
      manager: {
        id: result.id,
        email: result.email,
        name: result.name,
        updatedAt: result.updatedAt
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

    console.error("매니저 정보 수정 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/managers/[id] - 매니저 삭제 (비활성화)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin();

    // 매니저 존재 확인
    const manager = await prisma.user.findFirst({
      where: {
        id: params.id,
        role: "ADMIN",
        adminType: "MANAGER"
      }
    });

    if (!manager) {
      return NextResponse.json(
        { error: "존재하지 않는 매니저입니다" },
        { status: 404 }
      );
    }

    // 매니저의 모든 광고주 배정 비활성화
    await prisma.advertiserManager.updateMany({
      where: { managerId: params.id },
      data: { isActive: false }
    });

    // 매니저 상태를 DELETED로 변경
    await prisma.user.update({
      where: { id: params.id },
      data: { status: "DELETED" }
    });

    return NextResponse.json({
      message: "매니저가 성공적으로 삭제되었습니다"
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("권한")) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error("매니저 삭제 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
