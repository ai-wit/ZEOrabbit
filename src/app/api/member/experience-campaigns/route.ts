import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";

const applyAsTeamLeaderSchema = z.object({
  campaignId: z.string(),
  teamName: z.string().min(1).max(50),
  teamDescription: z.string().optional(),
});

// 회원 권한 확인 헬퍼 함수
async function requireMember() {
  return await requireRole("MEMBER");
}

// GET /api/member/experience-campaigns - 체험단 공고 목록 조회
export async function GET(request: NextRequest) {
  try {
    const user = await requireMember();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status") || "ACTIVE";
    const offset = (page - 1) * limit;

    // 현재 활성화된 공고만 조회 (신청 기간 내)
    const now = new Date();
    const campaigns = await prisma.experienceCampaign.findMany({
      where: {
        status: status as any,
        applicationDeadline: { gte: now }
      },
      select: {
        id: true,
        title: true,
        description: true,
        missionGuide: true,
        benefits: true,
        targetTeamCount: true,
        maxMembersPerTeam: true,
        applicationDeadline: true,
        startDate: true,
        endDate: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        advertiser: {
          select: {
            user: {
              select: {
                name: true
              }
            }
          }
        },
        place: {
          select: {
            name: true,
            externalProvider: true
          }
        },
        manager: {
          select: {
            name: true
          }
        },
        teams: {
          where: { status: { in: ["FORMING", "ACTIVE"] } }, // PENDING_LEADER_APPROVAL 제외
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            leaderId: true,
            memberships: {
              select: { id: true }
            },
            _count: { select: { memberships: true } }
          }
        },
        _count: {
          select: {
            teams: true // 모든 상태의 팀을 카운트
          }
        }
      },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit
    });

    // 각 공고에 대해 사용자의 참여 상태 추가
    console.log('사용자 정보:', { id: user.id, memberType: user.memberType, role: user.role });
    const campaignsWithUserStatus = await Promise.all(
      campaigns.map(async (campaign) => {
        // 사용자가 이미 팀장으로 참여했는지 확인
        const userTeamAsLeader = await prisma.team.findFirst({
          where: {
            experienceCampaignId: campaign.id,
            leaderId: user.id,
            status: { in: ["FORMING", "ACTIVE"] }
          }
        });

        // 사용자가 이미 팀원으로 참여했는지 확인
        const userMembership = await prisma.teamMembership.findFirst({
          where: {
            team: { experienceCampaignId: campaign.id },
            memberId: user.id,
            status: { in: ["PENDING", "APPROVED"] }
          }
        });

        let userStatus: "available" | "applied_as_leader" | "leader_application_pending" | "member" | "leader" = "available";

        if (userTeamAsLeader) {
          userStatus = "leader";
        } else if (userMembership) {
          userStatus = userMembership.status === "PENDING" ? "applied_as_leader" : "member";
        } else {
          // 사용자가 팀장으로 신청했는지 확인 (PENDING_LEADER_APPROVAL 상태)
          const userPendingTeamAsLeader = await prisma.team.findFirst({
            where: {
              experienceCampaignId: campaign.id,
              leaderId: user.id,
              status: "PENDING_LEADER_APPROVAL"
            }
          });

          if (userPendingTeamAsLeader) {
            userStatus = "leader_application_pending";
          }
        }

        const canApplyAsLeader = user.memberType === "TEAM_LEADER" &&
                           userStatus === "available" &&
                           campaign._count.teams < campaign.targetTeamCount;
        console.log(`캠페인 ${campaign.id} canApplyAsLeader 계산:`, {
          memberType: user.memberType,
          userStatus,
          teamCount: campaign._count.teams,
          targetTeamCount: campaign.targetTeamCount,
          result: canApplyAsLeader
        });

        return {
          ...campaign,
          userStatus,
          canApplyAsLeader
        };
      })
    );

    const total = await prisma.experienceCampaign.count({
      where: {
        status: status as any,
        applicationDeadline: { gte: now }
      }
    });

    return NextResponse.json({
      campaigns: campaignsWithUserStatus,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("체험단 공고 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// POST /api/member/experience-campaigns/apply-as-team-leader - 팀장으로 신청
export async function POST(request: NextRequest) {
  try {
    const user = await requireMember();

    // 팀장 권한 확인
    if (user.memberType !== "TEAM_LEADER") {
      return NextResponse.json(
        { error: "팀장 권한이 필요합니다" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { campaignId, teamName, teamDescription } = applyAsTeamLeaderSchema.parse(body);

    // 체험단 공고 확인
    const campaign = await prisma.experienceCampaign.findUnique({
      where: { id: campaignId }
    });

    if (!campaign || campaign.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "존재하지 않는 체험단 공고입니다" },
        { status: 404 }
      );
    }

    // 신청 기간 확인
    if (new Date() > campaign.applicationDeadline) {
      return NextResponse.json(
        { error: "신청 기간이 종료되었습니다" },
        { status: 400 }
      );
    }

    // 이미 신청했거나 참여 중인지 확인
    const existingTeam = await prisma.team.findFirst({
      where: {
        experienceCampaignId: campaignId,
        leaderId: user.id,
        status: { in: ["FORMING", "ACTIVE"] }
      }
    });

    const existingMembership = await prisma.teamMembership.findFirst({
      where: {
        team: { experienceCampaignId: campaignId },
        memberId: user.id,
        status: { in: ["PENDING", "APPROVED"] }
      }
    });

    if (existingTeam || existingMembership) {
      return NextResponse.json(
        { error: "이미 참여 중인 체험단입니다" },
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
        { error: "팀 모집이 마감되었습니다" },
        { status: 400 }
      );
    }

    // 팀장 신청 생성 (매니저 승인 대기)
    const teamApplication = await prisma.team.create({
      data: {
        experienceCampaignId: campaignId,
        leaderId: user.id,
        name: teamName,
        description: teamDescription,
        status: "PENDING_LEADER_APPROVAL", // 매니저 승인 대기 상태
      },
      include: {
        experienceCampaign: { select: { title: true } },
        leader: { select: { name: true } }
      }
    });

    return NextResponse.json({
      message: "팀장 신청이 완료되었습니다. 매니저 승인을 기다려주세요.",
      teamApplication
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "유효하지 않은 입력입니다", details: error.errors },
        { status: 400 }
      );
    }

    console.error("팀장 신청 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
