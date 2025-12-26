import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";

const approveReportSchema = z.object({
  reviewComments: z.string().optional(),
});

// 매니저 권한 확인 헬퍼 함수
async function requireManager() {
  const user = await requireRole("ADMIN");
  if (user.adminType !== "MANAGER") {
    throw new Error("매니저 권한이 필요합니다");
  }
  return user;
}

// POST /api/admin/experience-campaigns/[id]/reports/[reportId]/approve - 리포트 승인
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string, reportId: string } }
) {
  try {
    const user = await requireManager();
    const campaignId = params.id;
    const reportId = params.reportId;

    const body = await request.json();
    const { reviewComments } = approveReportSchema.parse(body);

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

    // 리포트 존재 확인
    const report = await prisma.experienceReport.findFirst({
      where: {
        id: reportId,
        campaignId
      }
    });

    if (!report) {
      return NextResponse.json(
        { error: "존재하지 않는 리포트입니다" },
        { status: 404 }
      );
    }

    if (report.status !== "GENERATED" && report.status !== "UNDER_REVIEW") {
      return NextResponse.json(
        { error: "승인할 수 있는 상태가 아닙니다" },
        { status: 400 }
      );
    }

    // 리포트 승인
    const updatedReport = await prisma.experienceReport.update({
      where: { id: reportId },
      data: {
        status: "APPROVED",
        reviewedBy: user.id,
        reviewedAt: new Date(),
        reviewComments
      }
    });

    return NextResponse.json({
      message: "리포트가 승인되었습니다",
      report: updatedReport
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "유효하지 않은 입력입니다", details: error.errors },
        { status: 400 }
      );
    }

    console.error("리포트 승인 실패:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
