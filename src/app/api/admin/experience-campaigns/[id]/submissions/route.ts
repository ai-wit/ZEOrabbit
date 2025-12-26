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

// GET /api/admin/experience-campaigns/[id]/submissions - 제출물 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireManager();
    const campaignId = params.id;

    // 체험단 공고 권한 확인
    const campaign = await prisma.experienceCampaign.findFirst({
      where: {
        id: campaignId,
        managerId: user.id
      }
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "체험단 공고에 대한 권한이 없습니다" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, REVISION_REQUESTED
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    // 제출물 목록 조회
    const whereCondition: any = {
      team: { experienceCampaignId: campaignId }
    };

    if (status) {
      whereCondition.status = status;
    }

    const submissions = await prisma.experienceSubmission.findMany({
      where: whereCondition,
      include: {
        team: {
          include: {
            leader: { select: { name: true, email: true } },
            memberships: {
              where: { status: "APPROVED" },
              select: { id: true }
            }
          }
        },
        submitter: { select: { name: true } },
        reviewer: { select: { name: true } }
      },
      orderBy: { updatedAt: "desc" },
      skip: offset,
      take: limit
    });

    const total = await prisma.experienceSubmission.count({
      where: whereCondition
    });

    // 각 제출물에 추가 정보 추가
    const submissionsWithDetails = submissions.map(submission => ({
      ...submission,
      teamMemberCount: submission.team.memberships.length,
      hasMaterials: !!submission.materialsPath,
      hasContent: !!(submission.contentTitle || submission.contentBody)
    }));

    return NextResponse.json({
      submissions: submissionsWithDetails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("제출물 목록 조회 실패:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
