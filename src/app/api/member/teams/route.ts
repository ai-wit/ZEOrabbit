import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { randomBytes } from "crypto";

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

// POST /api/member/teams/create-invitation - 초대코드 생성
export async function POST(request: NextRequest) {
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
