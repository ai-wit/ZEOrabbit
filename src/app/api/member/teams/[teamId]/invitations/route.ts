import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { randomBytes } from "crypto";

const createInvitationSchema = z.object({
  maxUses: z.number().min(1).max(10).default(1),
  expiresInHours: z.number().min(1).max(168).default(24), // 최대 1주
});

// 회원 권한 확인 헬퍼 함수
async function requireMember() {
  return await requireRole("MEMBER");
}

// 팀장 권한 확인 헬퍼 함수
async function requireTeamLeader(teamId: string) {
  const user = await requireMember();

  if (user.memberType !== "TEAM_LEADER") {
    throw new Error("팀장 권한이 필요합니다");
  }

  // 팀장 권한 확인
  const team = await prisma.team.findUnique({
    where: { id: teamId }
  });

  if (!team || team.leaderId !== user.id) {
    throw new Error("팀장 권한이 없습니다");
  }

  return user;
}

// POST /api/member/teams/[teamId]/invitations - 초대코드 생성
export async function POST(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const user = await requireTeamLeader(params.teamId);

    const body = await request.json();
    const { maxUses, expiresInHours } = createInvitationSchema.parse(body);

    // 팀 상태 확인
    const team = await prisma.team.findUnique({
      where: { id: params.teamId },
      include: {
        experienceCampaign: true
      }
    });

    if (!team) {
      return NextResponse.json(
        { error: "존재하지 않는 팀입니다" },
        { status: 404 }
      );
    }

    if (team.status !== "FORMING") {
      return NextResponse.json(
        { error: "팀원이 필요한 상태가 아닙니다" },
        { status: 400 }
      );
    }

    if (team.experienceCampaign.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "종료된 체험단입니다" },
        { status: 400 }
      );
    }

    // 초대코드 생성 (8자리 영숫자)
    const code = randomBytes(4).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    const invitationCode = await prisma.invitationCode.create({
      data: {
        teamId: params.teamId,
        code,
        createdBy: user.id,
        maxUses,
        expiresAt,
      },
      include: {
        team: {
          select: { name: true }
        }
      }
    });

    return NextResponse.json({
      invitationCode: {
        id: invitationCode.id,
        code: invitationCode.code,
        maxUses: invitationCode.maxUses,
        currentUses: invitationCode.currentUses,
        expiresAt: invitationCode.expiresAt,
        teamName: invitationCode.team.name,
        inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/member/experience/join?code=${invitationCode.code}`
      }
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

    console.error("초대코드 생성 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// GET /api/member/teams/[teamId]/invitations - 초대코드 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const user = await requireTeamLeader(params.teamId);

    const invitationCodes = await prisma.invitationCode.findMany({
      where: { teamId: params.teamId },
      include: {
        createdByUser: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({
      invitationCodes: invitationCodes.map(code => ({
        id: code.id,
        code: code.code,
        maxUses: code.maxUses,
        currentUses: code.currentUses,
        isActive: code.isActive,
        expiresAt: code.expiresAt,
        createdAt: code.createdAt,
        createdByName: code.createdByUser?.name,
        inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/member/experience/join?code=${code.code}`
      }))
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("권한")) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error("초대코드 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
