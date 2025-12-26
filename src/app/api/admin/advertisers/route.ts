import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { hash } from "bcryptjs";

const createAdvertiserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(50),
  displayName: z.string().min(1).max(100).optional(),
  password: z.string().min(8),
});

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

// GET /api/admin/advertisers - 광고주 목록 조회
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole("ADMIN");
    const isManager = user.adminType === "MANAGER";
    const { searchParams } = new URL(request.url);

    // 매니저 권한 확인
    if (isManager && user.adminType !== "MANAGER") {
      return NextResponse.json(
        { error: "매니저 권한이 필요합니다" },
        { status: 403 }
      );
    }

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    // 매니저인 경우 담당 광고주만 조회
    const whereCondition: any = {};
    if (isManager) {
      whereCondition.advertiserManagers = {
        some: {
          managerId: user.id,
          isActive: true
        }
      };
    }

    const advertisers = await prisma.advertiserProfile.findMany({
      where: whereCondition,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            status: true,
            createdAt: true
          }
        },
        places: {
          select: {
            id: true,
            name: true
          }
        },
        campaigns: {
          select: {
            id: true,
            name: true,
            status: true
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
            }
          }
        },
        _count: {
          select: {
            places: true,
            campaigns: true,
            advertiserManagers: {
              where: { isActive: true }
            }
          }
        }
      },
      orderBy: { user: { createdAt: "desc" } },
      skip: offset,
      take: limit
    });

    // 응답 형식 변환
    const formattedAdvertisers = advertisers.map(advertiser => ({
      id: advertiser.user.id,
      email: advertiser.user.email,
      name: advertiser.user.name,
      displayName: advertiser.displayName,
      status: advertiser.user.status,
      createdAt: advertiser.user.createdAt,
      placesCount: advertiser._count.places,
      campaignsCount: advertiser._count.campaigns,
      managersCount: advertiser._count.advertiserManagers,
      managers: advertiser.advertiserManagers.map(am => am.manager),
      places: advertiser.places,
      campaigns: advertiser.campaigns
    }));

    const total = await prisma.advertiserProfile.count({ where: whereCondition });

    return NextResponse.json({
      advertisers: formattedAdvertisers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("권한")) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error("광고주 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// POST /api/admin/advertisers - 광고주 등록
export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const body = await request.json();
    const { email, name, displayName, password } = createAdvertiserSchema.parse(body);

    // 이메일 중복 확인
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "이미 사용 중인 이메일입니다" },
        { status: 409 }
      );
    }

    // 트랜잭션으로 광고주 생성
    const result = await prisma.$transaction(async (tx) => {
      // 사용자 생성
      const user = await tx.user.create({
        data: {
          email,
          name,
          role: "ADVERTISER",
        }
      });

      // 광고주 프로필 생성
      const advertiserProfile = await tx.advertiserProfile.create({
        data: {
          userId: user.id,
          displayName: displayName || name,
        }
      });

      // 비밀번호 해시 생성 및 저장
      const passwordHash = await hash(password, 12);
      await tx.authCredential.create({
        data: {
          userId: user.id,
          passwordHash
        }
      });

      // 약관 동의 생성
      await tx.termsAgreement.create({
        data: {
          userId: user.id,
          type: "SERVICE",
          version: "1.0"
        }
      });

      return { user, advertiserProfile };
    });

    return NextResponse.json({
      message: "광고주가 성공적으로 등록되었습니다",
      advertiser: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        displayName: result.advertiserProfile.displayName,
        createdAt: result.user.createdAt
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

    console.error("광고주 등록 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
