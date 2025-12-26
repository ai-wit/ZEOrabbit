import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";

const createSubmissionSchema = z.object({
  materialsPath: z.string().optional(),
  materialsSize: z.number().optional(),
  contentTitle: z.string().optional(),
  contentBody: z.string().optional(),
  contentLinks: z.array(z.string()).optional(),
});

// 팀장 권한 확인 헬퍼 함수
async function requireTeamLeader(teamId: string) {
  const user = await requireRole("MEMBER");

  if (user.memberType !== "TEAM_LEADER") {
    throw new Error("팀장 권한이 필요합니다");
  }

  // 팀장 권한 확인
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { experienceCampaign: true }
  });

  if (!team || team.leaderId !== user.id) {
    throw new Error("팀장 권한이 없습니다");
  }

  return { user, team };
}

// GET /api/member/teams/[teamId]/submission - 제출물 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const { user, team } = await requireTeamLeader(params.teamId);

    // 팀의 제출물 조회
    const submission = await prisma.experienceSubmission.findUnique({
      where: { teamId: params.teamId },
      include: {
        submitter: { select: { name: true } },
        reviewer: { select: { name: true } }
      }
    });

    return NextResponse.json({ submission });
  } catch (error) {
    console.error("제출물 조회 실패:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "서버 오류가 발생했습니다" },
      { status: error instanceof Error && error.message.includes("권한") ? 403 : 500 }
    );
  }
}

// POST /api/member/teams/[teamId]/submission - 제출물 생성/업데이트
export async function POST(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const { user, team } = await requireTeamLeader(params.teamId);

    // 팀 상태 확인
    if (team.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "팀 구성 완료 상태에서만 제출할 수 있습니다" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const submissionData = createSubmissionSchema.parse(body);

    // 기존 제출물 확인
    const existingSubmission = await prisma.experienceSubmission.findUnique({
      where: { teamId: params.teamId }
    });

    let submission;

    if (existingSubmission) {
      // 업데이트
      submission = await prisma.experienceSubmission.update({
        where: { id: existingSubmission.id },
        data: {
          ...submissionData,
          materialsUploadedAt: submissionData.materialsPath ? new Date() : undefined,
          contentSubmittedAt: (submissionData.contentTitle || submissionData.contentBody) ? new Date() : undefined,
          status: "SUBMITTED"
        },
        include: {
          submitter: { select: { name: true } }
        }
      });
    } else {
      // 새로 생성
      submission = await prisma.experienceSubmission.create({
        data: {
          teamId: params.teamId,
          submittedBy: user.id,
          ...submissionData,
          materialsUploadedAt: submissionData.materialsPath ? new Date() : undefined,
          contentSubmittedAt: (submissionData.contentTitle || submissionData.contentBody) ? new Date() : undefined,
          status: "SUBMITTED"
        },
        include: {
          submitter: { select: { name: true } }
        }
      });
    }

    return NextResponse.json({
      message: "제출물이 성공적으로 저장되었습니다",
      submission
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "유효하지 않은 입력입니다", details: error.errors },
        { status: 400 }
      );
    }

    console.error("제출물 생성 실패:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "서버 오류가 발생했습니다" },
      { status: error instanceof Error && error.message.includes("권한") ? 403 : 500 }
    );
  }
}
