import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";

const createCampaignSchema = z.object({
  applicationId: z.string(), // 체험단 신청서 ID
  address: z.string(), // 장소 주소 (체험단 신청 시 작성한 주소)
  title: z.string().min(1).max(100),
  missionGuide: z.string().min(1), // 미션 가이드 (촬영 포인트)
  benefits: z.string().min(1), // 제공 내역
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

    // 체험단 신청 정보 조회
    const application = await prisma.experienceApplication.findUnique({
      where: { id: data.applicationId },
      include: {
        advertiser: true,
        pricingPlan: true
      }
    });

    if (!application) {
      return NextResponse.json(
        { error: "존재하지 않는 체험단 신청입니다" },
        { status: 404 }
      );
    }

    // 광고주 배정 확인
    const assignment = await prisma.advertiserManager.findFirst({
      where: {
        advertiserId: application.advertiserId,
        managerId: user.id,
        isActive: true
      }
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "배정되지 않은 광고주의 체험단 신청입니다" },
        { status: 403 }
      );
    }

    // 이미 공고가 등록된 신청인지 확인
    const existingCampaign = await prisma.experienceCampaign.findFirst({
      where: { applicationId: data.applicationId }
    });

    if (existingCampaign) {
      return NextResponse.json(
        { error: "이미 공고가 등록된 체험단 신청입니다" },
        { status: 400 }
      );
    }

    // 주소로 장소 찾기 또는 생성
    let place = await prisma.place.findFirst({
      where: {
        name: data.address,
        advertiserId: application.advertiserId
      }
    });

    // 장소가 없으면 새로 생성
    if (!place) {
      place = await prisma.place.create({
        data: {
          advertiserId: application.advertiserId,
          name: data.address
        }
      });
    }

    // 공고 생성
    const campaign = await prisma.experienceCampaign.create({
      data: {
        applicationId: data.applicationId,
        managerId: user.id,
        advertiserId: application.advertiserId,
        placeId: place.id,
        title: data.title,
        missionGuide: data.missionGuide,
        benefits: data.benefits,
        targetTeamCount: data.targetTeamCount,
        maxMembersPerTeam: data.maxMembersPerTeam,
        applicationDeadline: new Date(data.applicationDeadline),
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
      include: {
        advertiser: { include: { user: { select: { name: true } } } },
        place: true,
        manager: { select: { name: true } },
        application: {
          include: {
            pricingPlan: { select: { displayName: true } }
          }
        }
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
