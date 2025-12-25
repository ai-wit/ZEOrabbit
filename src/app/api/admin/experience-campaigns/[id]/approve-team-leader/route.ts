import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";

const approveTeamLeaderSchema = z.object({
  teamLeaderId: z.string(),
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

// POST /api/admin/experience-campaigns/[id]/approve-team-leader - 팀장 승인 및 팀 생성
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireManager();
    const campaignId = params.id;

    const body = await request.json();
    const { teamLeaderId, teamName, teamDescription } = approveTeamLeaderSchema.parse(body);

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

    // 팀장 권한 확인 (TEAM_LEADER 타입인지)
    const teamLeader = await prisma.user.findUnique({
      where: { id: teamLeaderId },
      select: { role: true, memberType: true, name: true }
    });

    if (!teamLeader || teamLeader.role !== "MEMBER" || teamLeader.memberType !== "TEAM_LEADER") {
      return NextResponse.json(
        { error: "유효하지 않은 팀장입니다" },
        { status: 400 }
      );
    }

    // 이미 팀을 가지고 있는지 확인
    const existingTeam = await prisma.team.findFirst({
      where: {
        experienceCampaignId: campaignId,
        leaderId: teamLeaderId,
        status: { in: ["FORMING", "ACTIVE"] }
      }
    });

    if (existingTeam) {
      return NextResponse.json(
        { error: "이미 승인된 팀이 있습니다" },
        { status: 409 }
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

    // 트랜잭션으로 팀 생성 및 멤버십 추가
    const result = await prisma.$transaction(async (tx) => {
      // 팀 생성
      const team = await tx.team.create({
        data: {
          experienceCampaignId: campaignId,
          leaderId: teamLeaderId,
          name: teamName,
          description: teamDescription,
          status: "FORMING",
        }
      });

      // 팀장 멤버십 생성
      await tx.teamMembership.create({
        data: {
          teamId: team.id,
          memberId: teamLeaderId,
          role: "LEADER",
          status: "APPROVED",
          decidedAt: new Date(),
          decidedBy: user.id,
        }
      });

      return team;
    });

    // 생성된 팀 정보 조회
    const teamWithDetails = await prisma.team.findUnique({
      where: { id: result.id },
      include: {
        leader: { select: { name: true } },
        experienceCampaign: { select: { title: true } },
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

    console.error("팀장 승인 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
