import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";

const reviewSubmissionSchema = z.object({
  action: z.enum(["approve", "reject", "request_revision"]),
  reviewComments: z.string().optional(),
  revisionComments: z.string().optional(),
});

// 매니저 권한 확인 헬퍼 함수
async function requireManager() {
  const user = await requireRole("ADMIN");
  if (user.adminType !== "MANAGER") {
    throw new Error("매니저 권한이 필요합니다");
  }
  return user;
}

// POST /api/admin/experience-campaigns/[id]/submissions/[submissionId]/review - 제출물 검토
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string, submissionId: string } }
) {
  try {
    const user = await requireManager();
    const campaignId = params.id;
    const submissionId = params.submissionId;

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

    const body = await request.json();
    const { action, reviewComments, revisionComments } = reviewSubmissionSchema.parse(body);

    // 제출물 존재 확인
    const submission = await prisma.experienceSubmission.findFirst({
      where: {
        id: submissionId,
        team: { experienceCampaignId: campaignId }
      },
      include: {
        team: {
          include: {
            experienceCampaign: { select: { title: true } },
            leader: { select: { name: true } }
          }
        }
      }
    });

    if (!submission) {
      return NextResponse.json(
        { error: "존재하지 않는 제출물입니다" },
        { status: 404 }
      );
    }

    if (submission.status !== "SUBMITTED") {
      return NextResponse.json(
        { error: "검토할 수 있는 상태가 아닙니다" },
        { status: 400 }
      );
    }

    // 상태 결정
    let newStatus: string;
    let updateData: any = {
      reviewedBy: user.id,
      reviewedAt: new Date(),
      reviewComments
    };

    switch (action) {
      case "approve":
        newStatus = "APPROVED";
        break;
      case "reject":
        newStatus = "REJECTED";
        break;
      case "request_revision":
        newStatus = "REVISION_REQUESTED";
        updateData.revisionComments = revisionComments;
        updateData.revisionRequestedAt = new Date();
        break;
    }

    updateData.status = newStatus;

    // 제출물 업데이트
    const updatedSubmission = await prisma.experienceSubmission.update({
      where: { id: submissionId },
      data: updateData,
      include: {
        team: {
          include: {
            leader: { select: { name: true } }
          }
        },
        submitter: { select: { name: true } },
        reviewer: { select: { name: true } }
      }
    });

    return NextResponse.json({
      message: action === "approve" ? "제출물이 승인되었습니다" :
              action === "reject" ? "제출물이 거절되었습니다" :
              "수정 요청이 전송되었습니다",
      submission: updatedSubmission
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "유효하지 않은 입력입니다", details: error.errors },
        { status: 400 }
      );
    }

    console.error("제출물 검토 실패:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
