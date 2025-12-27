import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";

const approveTeamSchema = z.object({
  teamId: z.string(),
  teamName: z.string().min(1).max(50),
  teamDescription: z.string().optional(),
});

// 매니저 권한 확인 헬퍼 함수
async function requireManager() {
  const user = await requireRole("ADMIN");
  if (user.adminType !== "MANAGER") {
    throw new Error("매니저 권한이 필요합니다");
  }
  return user;
}

// POST /api/admin/experience-campaigns/[id]/approve-team - 팀 신청 승인
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireManager();
    const campaignId = params.id;

    const body = await request.json();
    const { teamId, teamName, teamDescription } = approveTeamSchema.parse(body);

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

    // 신청 마감일 확인
    if (new Date() > campaign.applicationDeadline) {
      return NextResponse.json(
        { error: "신청 기간이 종료되었습니다" },
        { status: 400 }
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
        memberships: {
          include: {
            member: { select: { name: true } }
          }
        }
      }
    });

    if (!team) {
      return NextResponse.json(
        { error: "존재하지 않거나 승인할 수 없는 팀 신청입니다" },
        { status: 404 }
      );
    }

    // 목표 팀 수 확인
    const currentTeamCount = await prisma.team.count({
      where: {
        experienceCampaignId: campaignId,
        status: { in: ["FORMING", "ACTIVE"] }
      }
    });

    if (currentTeamCount >= campaign.targetTeamCount) {
      return NextResponse.json(
        { error: "목표 팀 수를 초과했습니다" },
        { status: 400 }
      );
    }

    // 트랜잭션으로 팀 승인
    const result = await prisma.$transaction(async (tx) => {
      // 팀 상태 업데이트
      const updatedTeam = await tx.team.update({
        where: { id: teamId },
        data: {
          name: teamName,
          description: teamDescription,
          status: "FORMING",
        }
      });

      // 팀장 멤버십 승인 처리
      await tx.teamMembership.updateMany({
        where: {
          teamId: teamId,
          role: "LEADER"
        },
        data: {
          status: "APPROVED",
          decidedAt: new Date(),
          decidedBy: user.id
        }
      });

      // 기존 팀원 멤버십도 승인 처리 (팀장 초대가 아닌 일반 신청자들)
      await tx.teamMembership.updateMany({
        where: {
          teamId: teamId,
          role: "MEMBER",
          status: "PENDING"
        },
        data: {
          status: "APPROVED",
          decidedAt: new Date(),
          decidedBy: user.id
        }
      });

      return updatedTeam;
    });

    // 업데이트된 팀 정보 조회
    const teamWithDetails = await prisma.team.findUnique({
      where: { id: result.id },
      include: {
        leader: { select: { name: true } },
        memberships: {
          include: {
            member: { select: { name: true } }
          }
        }
      }
    });

    return NextResponse.json(teamWithDetails);
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

    console.error("팀 신청 승인 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
