import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";

const decideMembershipSchema = z.object({
  membershipId: z.string().trim().min(1),
  action: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        const normalized = val.trim().toLowerCase();
        // 잘못된 값이 들어오면 기본적으로 'approve'로 처리 (안전하게)
        if (!['approve', 'reject'].includes(normalized)) {
          console.warn(`잘못된 action 값 '${val}'을 'approve'로 변환합니다`);
          return 'approve';
        }
        return normalized;
      }
      // 기본값 설정
      console.warn(`action 값이 string이 아닙니다. 기본값 'approve'로 설정합니다. 받은 값:`, val);
      return 'approve';
    },
    z.enum(["approve", "reject"])
  ),
  reason: z.string().optional(),
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

// GET /api/member/teams/[teamId]/memberships - 팀 멤버십 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const user = await requireMember();
    const teamId = params.teamId;

    // 팀 접근 권한 확인 (팀장 또는 팀원)
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        OR: [
          { leaderId: user.id },
          {
            memberships: {
              some: {
                memberId: user.id,
                status: "APPROVED"
              }
            }
          }
        ]
      }
    });

    if (!team) {
      return NextResponse.json(
        { error: "팀 접근 권한이 없습니다" },
        { status: 403 }
      );
    }

    const memberships = await prisma.teamMembership.findMany({
      where: { teamId },
      include: {
        member: { select: { name: true, email: true } },
        decidedByUser: { select: { name: true } }
      },
      orderBy: { appliedAt: "desc" }
    });

    return NextResponse.json({ memberships });
  } catch (error) {
    console.error("팀 멤버십 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// DELETE /api/member/teams/[teamId]/memberships/[membershipId] - 팀원 추방
export async function DELETE(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const user = await requireTeamLeader(params.teamId);

    const { searchParams } = new URL(request.url);
    const membershipId = searchParams.get('membershipId');

    if (!membershipId) {
      return NextResponse.json(
        { error: "멤버십 ID가 필요합니다" },
        { status: 400 }
      );
    }

    // 멤버십 존재 및 팀 소속 확인
    const membership = await prisma.teamMembership.findFirst({
      where: {
        id: membershipId,
        teamId: params.teamId
      },
      include: {
        member: { select: { name: true } },
        team: { select: { status: true, name: true } }
      }
    });

    if (!membership) {
      return NextResponse.json(
        { error: "존재하지 않는 멤버십입니다" },
        { status: 404 }
      );
    }

    if (membership.status !== "APPROVED") {
      return NextResponse.json(
        { error: "승인된 팀원만 추방할 수 있습니다" },
        { status: 400 }
      );
    }

    if (membership.team.status !== "FORMING") {
      return NextResponse.json(
        { error: "팀 구성 중인 상태에서만 추방할 수 있습니다" },
        { status: 400 }
      );
    }

    // 멤버십 삭제
    await prisma.teamMembership.delete({
      where: { id: membershipId }
    });

    return NextResponse.json({
      message: `${membership.member.name}님이 팀에서 추방되었습니다`,
      membership: {
        id: membership.id,
        memberName: membership.member.name
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("권한")) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error("팀원 추방 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// POST /api/member/teams/[teamId]/memberships/decide - 멤버십 승인/거절
export async function POST(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const user = await requireTeamLeader(params.teamId);

    const body = await request.json();
    const { membershipId, action, reason } = decideMembershipSchema.parse(body);

    // 멤버십 존재 및 팀 소속 확인
    const membership = await prisma.teamMembership.findFirst({
      where: {
        id: membershipId,
        teamId: params.teamId
      },
      include: {
        team: true,
        member: { select: { name: true } }
      }
    });

    if (!membership) {
      return NextResponse.json(
        { error: "존재하지 않는 멤버십입니다" },
        { status: 404 }
      );
    }

    if (membership.status !== "PENDING") {
      return NextResponse.json(
        { error: "이미 처리된 신청입니다" },
        { status: 400 }
      );
    }

    // 팀 최대 인원 확인 (승인 시)
    if (action === "approve") {
      const campaign = await prisma.experienceCampaign.findUnique({
        where: { id: membership.team.experienceCampaignId }
      });

      if (!campaign) {
        return NextResponse.json(
          { error: "체험단 공고를 찾을 수 없습니다" },
          { status: 404 }
        );
      }

      const currentMemberCount = await prisma.teamMembership.count({
        where: {
          teamId: params.teamId,
          status: "APPROVED"
        }
      });

      if (currentMemberCount >= campaign.maxMembersPerTeam) {
        return NextResponse.json(
          { error: "팀 정원이 초과되었습니다" },
          { status: 400 }
        );
      }
    }

    // 멤버십 상태 업데이트
    const updatedMembership = await prisma.teamMembership.update({
      where: { id: membershipId },
      data: {
        status: action === "approve" ? "APPROVED" : "REJECTED",
        decidedAt: new Date(),
        decidedBy: user.id,
        failureReason: action === "reject" ? reason : null
      },
      include: {
        member: { select: { name: true } },
        decidedByUser: { select: { name: true } }
      }
    });

    return NextResponse.json({
      message: action === "approve" ? "멤버십이 승인되었습니다" : "멤버십이 거절되었습니다",
      membership: updatedMembership
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

    console.error("멤버십 결정 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
