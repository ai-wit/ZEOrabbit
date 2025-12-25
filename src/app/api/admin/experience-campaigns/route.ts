import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";

const createCampaignSchema = z.object({
  advertiserId: z.string(),
  placeId: z.string(),
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  targetTeamCount: z.number().min(1).max(50).default(1),
  maxMembersPerTeam: z.number().min(2).max(10).default(5),
  applicationDeadline: z.string().datetime(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
}).refine((data) => new Date(data.startDate) < new Date(data.endDate), {
  message: "종료일은 시작일보다 늦어야 합니다",
  path: ["endDate"],
}).refine((data) => new Date(data.applicationDeadline) < new Date(data.startDate), {
  message: "신청 마감일은 시작일보다 빨라야 합니다",
  path: ["applicationDeadline"],
});

// 매니저 권한 확인 헬퍼 함수
async function requireManager() {
  const user = await requireRole("ADMIN");
  if (user.adminType !== "MANAGER") {
    throw new Error("매니저 권한이 필요합니다");
  }
  return user;
}

// POST /api/admin/experience-campaigns - 체험단 공고 생성
export async function POST(request: NextRequest) {
  try {
    const user = await requireManager();

    const body = await request.json();
    const data = createCampaignSchema.parse(body);

    // 광고주 배정 확인
    const assignment = await prisma.advertiserManager.findFirst({
      where: {
        advertiser: { userId: data.advertiserId },
        managerId: user.id,
        isActive: true
      }
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "배정되지 않은 광고주입니다" },
        { status: 403 }
      );
    }

    // 장소 소유권 확인
    const place = await prisma.place.findFirst({
      where: {
        id: data.placeId,
        advertiserId: assignment.advertiserId
      }
    });

    if (!place) {
      return NextResponse.json(
        { error: "광고주의 장소가 아닙니다" },
        { status: 404 }
      );
    }

    // 공고 생성
    const campaign = await prisma.experienceCampaign.create({
      data: {
        managerId: user.id,
        advertiserId: assignment.advertiserId,
        placeId: data.placeId,
        title: data.title,
        description: data.description,
        targetTeamCount: data.targetTeamCount,
        maxMembersPerTeam: data.maxMembersPerTeam,
        applicationDeadline: new Date(data.applicationDeadline),
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
      include: {
        advertiser: { include: { user: { select: { name: true } } } },
        place: true,
        manager: { select: { name: true } }
      }
    });

    return NextResponse.json(campaign);
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

    console.error("체험단 공고 생성 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// GET /api/admin/experience-campaigns - 체험단 공고 목록 조회
export async function GET(request: NextRequest) {
  try {
    const user = await requireManager();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status") as any;
    const offset = (page - 1) * limit;

    const where = {
      managerId: user.id,
      ...(status && { status })
    };

    const campaigns = await prisma.experienceCampaign.findMany({
      where,
      include: {
        advertiser: { include: { user: { select: { name: true } } } },
        place: { select: { name: true } },
        teams: {
          select: {
            id: true,
            status: true,
            _count: { select: { memberships: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit
    });

    const total = await prisma.experienceCampaign.count({ where });

    return NextResponse.json({
      campaigns,
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

    console.error("체험단 공고 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
