import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";

const rejectTeamSchema = z.object({
  teamId: z.string(),
  reason: z.string().optional(),
});

// 매니저 권한 확인 헬퍼 함수
async function requireManager() {
  const user = await requireRole("ADMIN");
  if (user.adminType !== "MANAGER") {
    throw new Error("매니저 권한이 필요합니다");
  }
  return user;
}

// POST /api/admin/experience-campaigns/[id]/reject-team - 팀 신청 거절
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireManager();
    const campaignId = params.id;

    const body = await request.json();
    const { teamId, reason } = rejectTeamSchema.parse(body);

    // 체험단 공고 존재 및 권한 확인
    const campaign = await prisma.experienceCampaign.findFirst({
      where: {
        id: campaignId,
        managerId: user.id,
        status: "ACTIVE"
      }
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "존재하지 않거나 권한이 없는 체험단 공고입니다" },
        { status: 404 }
      );
    }

    // 팀 존재 및 신청 상태 확인
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        experienceCampaignId: campaignId,
        status: "PENDING_LEADER_APPROVAL"
      },
      include: {
        leader: { select: { name: true } },
        memberships: true
      }
    });

    if (!team) {
      return NextResponse.json(
        { error: "존재하지 않거나 거절할 수 없는 팀 신청입니다" },
        { status: 404 }
      );
    }

    // 트랜잭션으로 팀 거절 및 관련 데이터 처리
    await prisma.$transaction(async (tx) => {
      // 팀 상태를 CANCELLED로 변경
      await tx.team.update({
        where: { id: teamId },
        data: {
          status: "CANCELLED",
        }
      });

      // 모든 멤버십을 REJECTED로 변경
      await tx.teamMembership.updateMany({
        where: {
          teamId: teamId,
          status: { in: ["PENDING", "APPROVED"] }
        },
        data: {
          status: "REJECTED",
          decidedAt: new Date(),
          decidedBy: user.id,
          failureReason: reason
        }
      });
    });

    return NextResponse.json({
      success: true,
      message: "팀 신청이 거절되었습니다"
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

    console.error("팀 신청 거절 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
