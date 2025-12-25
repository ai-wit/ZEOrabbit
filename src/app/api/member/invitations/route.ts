import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";

const useInvitationSchema = z.object({
  code: z.string().length(8).regex(/^[A-Z0-9]+$/),
});

// 회원 권한 확인 헬퍼 함수
async function requireMember() {
  return await requireRole("MEMBER");
}

// POST /api/member/invitations/use - 초대코드 사용
export async function POST(request: NextRequest) {
  try {
    const user = await requireMember();

    const body = await request.json();
    const { code } = useInvitationSchema.parse(body);

    // 초대코드 조회
    const invitationCode = await prisma.invitationCode.findUnique({
      where: { code },
      include: {
        team: {
          include: {
            experienceCampaign: true,
            memberships: {
              where: { status: "APPROVED" },
              select: { id: true }
            }
          }
        }
      }
    });

    if (!invitationCode) {
      return NextResponse.json(
        { error: "유효하지 않은 초대코드입니다" },
        { status: 404 }
      );
    }

    // 초대코드 상태 확인
    if (!invitationCode.isActive) {
      return NextResponse.json(
        { error: "만료된 초대코드입니다" },
        { status: 400 }
      );
    }

    if (new Date() > invitationCode.expiresAt) {
      return NextResponse.json(
        { error: "만료된 초대코드입니다" },
        { status: 400 }
      );
    }

    if (invitationCode.currentUses >= invitationCode.maxUses) {
      return NextResponse.json(
        { error: "사용 횟수가 초과된 초대코드입니다" },
        { status: 400 }
      );
    }

    // 체험단 공고 상태 확인
    if (invitationCode.team.experienceCampaign.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "종료된 체험단입니다" },
        { status: 400 }
      );
    }

    // 이미 참여 중인지 확인
    const existingMembership = await prisma.teamMembership.findFirst({
      where: {
        teamId: invitationCode.team.id,
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
        team: { experienceCampaignId: invitationCode.team.experienceCampaignId },
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
    const approvedMemberships = invitationCode.team.memberships;
    if (approvedMemberships.length >= invitationCode.team.experienceCampaign.maxMembersPerTeam) {
      return NextResponse.json(
        { error: "팀 정원이 초과되었습니다" },
        { status: 400 }
      );
    }

    // 트랜잭션으로 멤버십 생성 및 초대코드 사용량 업데이트
    const result = await prisma.$transaction(async (tx) => {
      // 멤버십 생성
      const membership = await tx.teamMembership.create({
        data: {
          teamId: invitationCode.team.id,
          memberId: user.id,
          role: "MEMBER",
          status: "APPROVED", // 초대코드로는 바로 승인
          decidedAt: new Date(),
          decidedBy: invitationCode.team.leaderId,
          invitedByCode: invitationCode.code,
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

      // 초대코드 사용량 증가
      await tx.invitationCode.update({
        where: { id: invitationCode.id },
        data: { currentUses: { increment: 1 } }
      });

      return membership;
    });

    return NextResponse.json({
      message: "팀 참여가 완료되었습니다",
      membership: result
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "유효하지 않은 입력입니다", details: error.errors },
        { status: 400 }
      );
    }

    console.error("초대코드 사용 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// GET /api/member/invitations/validate - 초대코드 검증
export async function GET(request: NextRequest) {
  try {
    const user = await requireMember();

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { error: "초대코드가 필요합니다" },
        { status: 400 }
      );
    }

    // 초대코드 조회
    const invitationCode = await prisma.invitationCode.findUnique({
      where: { code },
      include: {
        team: {
          include: {
            experienceCampaign: {
              include: {
                advertiser: { include: { user: { select: { name: true } } } },
                place: { select: { name: true } }
              }
            },
            memberships: {
              where: { status: "APPROVED" },
              select: { id: true }
            }
          }
        },
        createdByUser: { select: { name: true } }
      }
    });

    if (!invitationCode) {
      return NextResponse.json(
        { error: "유효하지 않은 초대코드입니다" },
        { status: 404 }
      );
    }

    // 검증 결과
    const validation = {
      isValid: false,
      isActive: invitationCode.isActive,
      isExpired: new Date() > invitationCode.expiresAt,
      isUsedUp: invitationCode.currentUses >= invitationCode.maxUses,
      teamFull: invitationCode.team.memberships.length >= invitationCode.team.experienceCampaign.maxMembersPerTeam,
      alreadyMember: false,
      campaignEnded: invitationCode.team.experienceCampaign.status !== "ACTIVE",
      team: null as any
    };

    // 사용자 참여 상태 확인
    if (validation.isActive && !validation.isExpired && !validation.isUsedUp &&
        !validation.teamFull && !validation.campaignEnded) {

      const existingMembership = await prisma.teamMembership.findFirst({
        where: {
          teamId: invitationCode.team.id,
          memberId: user.id,
          status: { in: ["PENDING", "APPROVED"] }
        }
      });

      if (existingMembership) {
        validation.alreadyMember = true;
      } else {
        validation.isValid = true;
        validation.team = {
          id: invitationCode.team.id,
          name: invitationCode.team.name,
          experienceCampaign: {
            title: invitationCode.team.experienceCampaign.title,
            advertiserName: invitationCode.team.experienceCampaign.advertiser.user.name,
            placeName: invitationCode.team.experienceCampaign.place.name,
            startDate: invitationCode.team.experienceCampaign.startDate,
            endDate: invitationCode.team.experienceCampaign.endDate
          },
          currentMembers: invitationCode.team.memberships.length,
          maxMembers: invitationCode.team.experienceCampaign.maxMembersPerTeam,
          leaderName: invitationCode.createdByUser.name
        };
      }
    }

    return NextResponse.json({ validation });
  } catch (error) {
    console.error("초대코드 검증 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
