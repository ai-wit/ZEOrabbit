import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { randomBytes } from "crypto";

const completeTeamFormationSchema = z.object({
  teamId: z.string(),
});

const createInvitationSchema = z.object({
  teamId: z.string(),
  maxUses: z.number().min(1).max(10).default(1),
  expiresInHours: z.number().min(1).max(168).default(24), // 최대 1주
});

// 회원 권한 확인 헬퍼 함수
async function requireMember() {
  return await requireRole("MEMBER");
}

// 팀장 권한 확인 헬퍼 함수
async function requireTeamLeader(teamId?: string) {
  const user = await requireMember();

  if (user.memberType !== "TEAM_LEADER") {
    throw new Error("팀장 권한이 필요합니다");
  }

  if (teamId) {
    // 팀장 권한 확인
    const team = await prisma.team.findUnique({
      where: { id: teamId }
    });

    if (!team || team.leaderId !== user.id) {
      throw new Error("팀장 권한이 없습니다");
    }
  }

  return user;
}

// GET /api/member/teams - 사용자의 팀 목록 조회
export async function GET(request: NextRequest) {
  try {
    const user = await requireMember();

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role") || "all"; // leader, member, all

    let teams = [];

    if (role === "leader" || role === "all") {
      // 팀장인 팀들
      const leaderTeams = await prisma.team.findMany({
        where: { leaderId: user.id },
        include: {
          experienceCampaign: {
            include: {
              advertiser: { include: { user: { select: { name: true } } } },
              place: { select: { name: true } }
            }
          },
          memberships: {
            include: {
              member: { select: { name: true } }
            }
          },
          invitationCodes: {
            where: { isActive: true },
            select: { id: true, code: true, maxUses: true, currentUses: true, expiresAt: true }
          },
          _count: { select: { memberships: true } }
        },
        orderBy: { createdAt: "desc" }
      });
      teams.push(...leaderTeams.map(team => ({ ...team, userRole: "leader" })));
    }

    if (role === "member" || role === "all") {
      // 팀원인 팀들
      const memberTeams = await prisma.team.findMany({
        where: {
          memberships: {
            some: {
              memberId: user.id,
              status: "APPROVED"
            }
          }
        },
        include: {
          experienceCampaign: {
            include: {
              advertiser: { include: { user: { select: { name: true } } } },
              place: { select: { name: true } }
            }
          },
          leader: { select: { name: true } },
          memberships: {
            where: { memberId: user.id },
            select: { role: true, status: true }
          }
        },
        orderBy: { createdAt: "desc" }
      });
      teams.push(...memberTeams.map(team => ({ ...team, userRole: "member" })));
    }

    return NextResponse.json({ teams });
  } catch (error) {
    console.error("팀 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// POST /api/member/teams/apply-as-member - 팀원으로 참여 신청
export async function POST(request: NextRequest) {
  try {
    const user = await requireMember();

    const body = await request.json();
    const { teamId } = z.object({ teamId: z.string() }).parse(body);

    // 팀 정보 조회
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        experienceCampaign: true,
        memberships: {
          where: { status: "APPROVED" },
          select: { id: true }
        }
      }
    });

    if (!team) {
      return NextResponse.json(
        { error: "존재하지 않는 팀입니다" },
        { status: 404 }
      );
    }

    // 팀 상태 확인
    if (team.status !== "FORMING") {
      return NextResponse.json(
        { error: "참여 신청을 받지 않는 팀입니다" },
        { status: 400 }
      );
    }

    // 체험단 공고 상태 확인
    if (team.experienceCampaign.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "종료된 체험단입니다" },
        { status: 400 }
      );
    }

    // 이미 참여 중인지 확인
    const existingMembership = await prisma.teamMembership.findFirst({
      where: {
        teamId,
        memberId: user.id,
        status: { in: ["PENDING", "APPROVED"] }
      }
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: "이미 참여 중인 팀입니다" },
        { status: 409 }
      );
    }

    // 다른 팀에 참여 중인지 확인
    const otherMembership = await prisma.teamMembership.findFirst({
      where: {
        team: { experienceCampaignId: team.experienceCampaignId },
        memberId: user.id,
        status: { in: ["PENDING", "APPROVED"] }
      }
    });

    if (otherMembership) {
      return NextResponse.json(
        { error: "이미 다른 팀에 참여 중입니다" },
        { status: 409 }
      );
    }

    // 팀 정원 확인
    if (team.memberships.length >= team.experienceCampaign.maxMembersPerTeam) {
      return NextResponse.json(
        { error: "팀 정원이 초과되었습니다" },
        { status: 400 }
      );
    }

    // 팀원 참여 신청 생성
    const membership = await prisma.teamMembership.create({
      data: {
        teamId,
        memberId: user.id,
        role: "MEMBER",
        status: "PENDING", // 팀장 승인 대기
      },
      include: {
        team: {
          include: {
            experienceCampaign: { select: { title: true } },
            leader: { select: { name: true } }
          }
        },
        member: { select: { name: true } }
      }
    });

    return NextResponse.json({
      message: "팀 참여 신청이 완료되었습니다. 팀장 승인을 기다려주세요.",
      membership
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "유효하지 않은 입력입니다", details: error.errors },
        { status: 400 }
      );
    }

    console.error("팀 참여 신청 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// PUT /api/member/teams/complete-formation - 팀 구성 완료
export async function PUT(request: NextRequest) {
  try {
    const user = await requireTeamLeader(); // 팀장 권한 필요

    const body = await request.json();
    const { teamId } = completeTeamFormationSchema.parse(body);

    // 팀장 권한 재확인
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        memberships: {
          where: { status: "APPROVED" },
          select: { id: true }
        }
      }
    });

    if (!team || team.leaderId !== user.id) {
      return NextResponse.json(
        { error: "팀장 권한이 없습니다" },
        { status: 403 }
      );
    }

    // 팀 상태 확인
    if (team.status !== "FORMING") {
      return NextResponse.json(
        { error: "팀 구성 중인 상태가 아닙니다" },
        { status: 400 }
      );
    }

    // 최소 팀원 수 확인 (팀장 포함 최소 1명)
    if (team.memberships.length < 1) {
      return NextResponse.json(
        { error: "최소 1명의 팀원이 필요합니다" },
        { status: 400 }
      );
    }

    // 팀 상태를 ACTIVE로 변경
    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: { status: "ACTIVE" },
      include: {
        experienceCampaign: { select: { title: true } },
        memberships: {
          include: {
            member: { select: { name: true } }
          }
        }
      }
    });

    return NextResponse.json({
      message: "팀 구성이 완료되었습니다. 이제 자료를 업로드할 수 있습니다.",
      team: updatedTeam
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

    console.error("팀 구성 완료 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// POST /api/member/teams/create-invitation - 초대코드 생성
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireMember();

    if (user.memberType !== "TEAM_LEADER") {
      return NextResponse.json(
        { error: "팀장 권한이 필요합니다" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { teamId, maxUses, expiresInHours } = createInvitationSchema.parse(body);

    // 팀장 권한 확인
    const team = await prisma.team.findUnique({
      where: { id: teamId }
    });

    if (!team || team.leaderId !== user.id) {
      return NextResponse.json(
        { error: "팀장 권한이 없습니다" },
        { status: 403 }
      );
    }

    // 팀 상태 확인
    if (team.status !== "FORMING") {
      return NextResponse.json(
        { error: "팀원이 필요한 상태가 아닙니다" },
        { status: 400 }
      );
    }

    // 초대코드 생성 (8자리 영숫자)
    const code = randomBytes(4).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    const invitationCode = await prisma.invitationCode.create({
      data: {
        teamId,
        code,
        createdBy: user.id,
        maxUses,
        expiresAt,
      }
    });

    return NextResponse.json({
      invitationCode: {
        id: invitationCode.id,
        code: invitationCode.code,
        maxUses: invitationCode.maxUses,
        expiresAt: invitationCode.expiresAt,
        currentUses: invitationCode.currentUses
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "유효하지 않은 입력입니다", details: error.errors },
        { status: 400 }
      );
    }

    console.error("초대코드 생성 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
