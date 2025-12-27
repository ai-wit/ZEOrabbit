import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";

// 매니저 권한 확인 헬퍼 함수
async function requireManager() {
  const user = await requireRole("ADMIN");
  if (user.adminType !== "MANAGER") {
    throw new Error("매니저 권한이 필요합니다");
  }
  return user;
}

// GET /api/admin/experience-campaigns/[id]/team-applications - 팀 신청 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireManager();
    const campaignId = params.id;

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

    // 팀 신청 목록 조회 (모든 팀)
    const teamApplications = await prisma.team.findMany({
      where: {
        experienceCampaignId: campaignId
      },
      include: {
        leader: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        memberships: {
          include: {
            member: {
              select: {
                id: true,
                name: true
              }
            },
            decidedByUser: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    // 응답 데이터 가공
    const applications = teamApplications.map(team => {
      const approvedMemberships = team.memberships.filter(m => m.status === 'APPROVED');
      const pendingMemberships = team.memberships.filter(m => m.status === 'PENDING');
      const rejectedMemberships = team.memberships.filter(m => m.status === 'REJECTED');

      return {
        id: team.id,
        teamName: team.name || `팀 #${team.id.slice(-6)}`,
        status: team.status,
        leader: {
          id: team.leader.id,
          name: team.leader.name || '이름없음',
          email: team.leader.email
        },
        totalMemberCount: team.memberships.length,
        approvedMembers: approvedMemberships.map(membership => ({
          id: membership.member.id,
          name: membership.member.name || '이름없음',
          decidedBy: membership.decidedByUser?.name || null,
          decidedAt: membership.decidedAt
        })),
        pendingMembers: pendingMemberships.map(membership => ({
          id: membership.member.id,
          name: membership.member.name || '이름없음'
        })),
        rejectedMembers: rejectedMemberships.map(membership => ({
          id: membership.member.id,
          name: membership.member.name || '이름없음',
          decidedBy: membership.decidedByUser?.name || null,
          decidedAt: membership.decidedAt,
          failureReason: membership.failureReason
        })),
        appliedAt: team.createdAt,
        updatedAt: team.updatedAt,
        description: team.description
      };
    });

    return NextResponse.json({
      applications,
      totalCount: applications.length
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("권한")) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error("팀 신청 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
