import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { hash } from "bcryptjs";

const updateAdvertiserSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  displayName: z.string().min(1).max(100).optional(),
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

// 관리자 권한 확인 헬퍼 함수 (슈퍼관리자 또는 매니저)
async function requireAdminOrManager() {
  const user = await requireRole("ADMIN");
  return user;
}

// 매니저가 할당된 광고주인지 확인하는 헬퍼 함수
async function checkManagerAccess(advertiserUserId: string, managerUserId: string) {
  const assignment = await prisma.advertiserManager.findFirst({
    where: {
      advertiser: {
        userId: advertiserUserId
      },
      managerId: managerUserId,
      isActive: true
    }
  });

  return !!assignment;
}

// GET /api/admin/advertisers/[id] - 광고주 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdminOrManager();

    // 매니저인 경우, 자신이 할당된 광고주인지 확인
    if (user.adminType === "MANAGER") {
      const hasAccess = await checkManagerAccess(params.id, user.id);
      if (!hasAccess) {
        return NextResponse.json(
          { error: "권한이 없습니다" },
          { status: 403 }
        );
      }
    }

    const advertiser = await prisma.advertiserProfile.findUnique({
      where: { userId: params.id },
      include: {
        user: true,
        places: {
          include: {
            campaigns: {
              select: {
                id: true,
                name: true,
                status: true
              }
            }
          }
        },
        campaigns: {
          select: {
            id: true,
            name: true,
            status: true,
            missionType: true,
            startDate: true,
            endDate: true
          }
        },
        advertiserManagers: {
          where: { isActive: true },
          include: {
            manager: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            assignedByUser: {
              select: {
                name: true
              }
            }
          }
        },
        budgetLedgers: {
          select: {
            id: true,
            amountKrw: true,
            reason: true,
            createdAt: true
          },
          orderBy: { createdAt: "desc" },
          take: 5
        },
        payments: {
          select: {
            id: true,
            amountKrw: true,
            status: true,
            createdAt: true
          },
          orderBy: { createdAt: "desc" },
          take: 5
        }
      }
    });

    if (!advertiser) {
      return NextResponse.json(
        { error: "존재하지 않는 광고주입니다" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      advertiser: {
        id: advertiser.user.id,
        email: advertiser.user.email,
        name: advertiser.user.name,
        displayName: advertiser.displayName,
        status: advertiser.user.status,
        createdAt: advertiser.user.createdAt,
        updatedAt: advertiser.user.updatedAt,
        places: advertiser.places,
        campaigns: advertiser.campaigns,
        managers: advertiser.advertiserManagers.map(am => ({
          ...am.manager,
          assignedBy: am.assignedByUser.name,
          assignedAt: am.assignedAt
        })),
        recentBudgetLedgers: advertiser.budgetLedgers,
        recentPayments: advertiser.payments,
        stats: {
          placesCount: advertiser.places.length,
          campaignsCount: advertiser.campaigns.length,
          managersCount: advertiser.advertiserManagers.length
        }
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("권한")) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error("광고주 상세 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/advertisers/[id] - 광고주 정보 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin();

    const body = await request.json();
    const updateData = updateAdvertiserSchema.parse(body);

    // 광고주 존재 확인
    const existingAdvertiser = await prisma.advertiserProfile.findUnique({
      where: { userId: params.id }
    });

    if (!existingAdvertiser) {
      return NextResponse.json(
        { error: "존재하지 않는 광고주입니다" },
        { status: 404 }
      );
    }

    // 이메일 중복 확인 (이메일 변경 시)
    if (updateData.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: updateData.email,
          id: { not: params.id }
        }
      });

      if (existingUser) {
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

      // 광고주 프로필 업데이트
      const updatedProfile = await tx.advertiserProfile.update({
        where: { userId: params.id },
        data: {
          ...(updateData.displayName && { displayName: updateData.displayName })
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

      return { updatedUser, updatedProfile };
    });

    return NextResponse.json({
      message: "광고주 정보가 성공적으로 수정되었습니다",
      advertiser: {
        id: result.updatedUser.id,
        email: result.updatedUser.email,
        name: result.updatedUser.name,
        displayName: result.updatedProfile.displayName,
        updatedAt: result.updatedUser.updatedAt
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

    console.error("광고주 정보 수정 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/advertisers/[id] - 광고주 삭제 (비활성화)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin();

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

    // 광고주의 모든 배정 비활성화
    await prisma.advertiserManager.updateMany({
      where: { advertiserId: advertiser.id },
      data: { isActive: false }
    });

    // 사용자 상태를 DELETED로 변경
    await prisma.user.update({
      where: { id: params.id },
      data: { status: "DELETED" }
    });

    return NextResponse.json({
      message: "광고주가 성공적으로 삭제되었습니다"
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("권한")) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error("광고주 삭제 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
