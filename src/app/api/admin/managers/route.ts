import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { hash } from "bcryptjs";

const createManagerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(50),
  password: z.string().min(8),
});

// Super 관리자 권한 확인 헬퍼 함수
async function requireSuperAdmin() {
  const user = await requireRole("ADMIN");
  if (user.adminType !== "SUPER") {
    throw new Error("Super 관리자 권한이 필요합니다");
  }
  return user;
}

// GET /api/admin/managers - 매니저 목록 조회
export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const q = searchParams.get("q") || "";
    const offset = (page - 1) * limit;

    const managers = await prisma.user.findMany({
      where: {
        role: "ADMIN",
        adminType: "MANAGER",
        ...(q && {
          OR: [
            { name: { contains: q,  } },
            { email: { contains: q,  } }
          ]
        })
      },
      include: {
        _count: {
          select: {
            managedAdvertisers: {
              where: { isActive: true }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit
    });

    // 각 매니저의 광고주 목록도 포함
    const managersWithAdvertisers = await Promise.all(
      managers.map(async (manager) => {
        const assignments = await prisma.advertiserManager.findMany({
          where: {
            managerId: manager.id,
            isActive: true
          },
          include: {
            advertiser: {
              include: {
                user: { select: { name: true, email: true } }
              }
            }
          }
        });

        return {
          ...manager,
          advertisers: assignments.map(a => a.advertiser)
        };
      })
    );

    const total = await prisma.user.count({
      where: {
        role: "ADMIN",
        adminType: "MANAGER",
        ...(q && {
          OR: [
            { name: { contains: q,  } },
            { email: { contains: q,  } }
          ]
        })
      }
    });

    return NextResponse.json({
      managers: managersWithAdvertisers,
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

    console.error("매니저 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// POST /api/admin/managers - 매니저 등록
export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const body = await request.json();
    const { email, name, password } = createManagerSchema.parse(body);

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

    // 트랜잭션으로 사용자와 인증 정보 생성
    const result = await prisma.$transaction(async (tx) => {
      // 사용자 생성
      const user = await tx.user.create({
        data: {
          email,
          name,
          role: "ADMIN",
          adminType: "MANAGER",
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

      // 약관 동의 생성 (필요한 경우)
      await tx.termsAgreement.create({
        data: {
          userId: user.id,
          type: "SERVICE",
          version: "1.0"
        }
      });

      return user;
    });

    return NextResponse.json({
      message: "매니저가 성공적으로 등록되었습니다",
      manager: {
        id: result.id,
        email: result.email,
        name: result.name,
        role: result.role,
        adminType: result.adminType,
        createdAt: result.createdAt
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

    console.error("매니저 등록 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
