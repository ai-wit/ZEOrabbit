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

// GET /api/admin/experience-campaigns/[id] - 체험단 공고 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireManager();

    const campaign = await prisma.experienceCampaign.findUnique({
      where: { id: params.id },
      include: {
        advertiser: {
          include: {
            user: { select: { name: true, email: true } }
          }
        },
        place: true,
        manager: { select: { name: true, email: true } },
        application: {
          include: {
            pricingPlan: { select: { displayName: true, priceKrw: true } }
          }
        },
        teams: {
          include: {
            memberships: {
              include: {
                member: {
                  select: {
                    name: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: "desc" }
        },
        _count: {
          select: {
            teams: true
          }
        }
      }
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "존재하지 않는 공고입니다" },
        { status: 404 }
      );
    }

    // 권한 확인: 자신의 공고인지 확인
    if (campaign.managerId !== user.id) {
      return NextResponse.json(
        { error: "접근 권한이 없습니다" },
        { status: 403 }
      );
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    if (error instanceof Error && error.message.includes("권한")) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error("체험단 공고 상세 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/experience-campaigns/[id] - 체험단 공고 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireManager();

    const body = await request.json();
    const {
      title,
      missionGuide,
      benefits,
      targetTeamCount,
      maxMembersPerTeam,
      applicationDeadline,
      startDate,
      endDate,
      status
    } = body;

    // 공고 존재 및 권한 확인
    const existingCampaign = await prisma.experienceCampaign.findUnique({
      where: { id: params.id },
      include: {
        application: true
      }
    });

    if (!existingCampaign) {
      return NextResponse.json(
        { error: "존재하지 않는 공고입니다" },
        { status: 404 }
      );
    }

    if (existingCampaign.managerId !== user.id) {
      return NextResponse.json(
        { error: "접근 권한이 없습니다" },
        { status: 403 }
      );
    }

    // 날짜 유효성 검증
    if (applicationDeadline && startDate) {
      const deadline = new Date(applicationDeadline);
      const start = new Date(startDate);
      if (deadline >= start) {
        return NextResponse.json(
          { error: "신청 마감일은 체험 시작일보다 빨라야 합니다" },
          { status: 400 }
        );
      }
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start >= end) {
        return NextResponse.json(
          { error: "체험 종료일은 시작일보다 늦어야 합니다" },
          { status: 400 }
        );
      }
    }

    // 공고 수정
    const updatedCampaign = await prisma.experienceCampaign.update({
      where: { id: params.id },
      data: {
        ...(title && { title }),
        ...(missionGuide && { missionGuide }),
        ...(benefits && { benefits }),
        ...(targetTeamCount && { targetTeamCount }),
        ...(maxMembersPerTeam && { maxMembersPerTeam }),
        ...(applicationDeadline && { applicationDeadline: new Date(applicationDeadline) }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(status && { status })
      },
      include: {
        advertiser: {
          include: {
            user: { select: { name: true } }
          }
        },
        place: true,
        manager: { select: { name: true } },
        application: {
          include: {
            pricingPlan: { select: { displayName: true } }
          }
        },
        teams: {
          select: {
            id: true,
            status: true,
            _count: { select: { memberships: true } }
          }
        }
      }
    });

    return NextResponse.json({ campaign: updatedCampaign });
  } catch (error) {
    console.error("체험단 공고 수정 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/experience-campaigns/[id] - 체험단 공고 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireManager();

    // 공고 존재 및 권한 확인
    const existingCampaign = await prisma.experienceCampaign.findUnique({
      where: { id: params.id }
    });

    if (!existingCampaign) {
      return NextResponse.json(
        { error: "존재하지 않는 공고입니다" },
        { status: 404 }
      );
    }

    if (existingCampaign.managerId !== user.id) {
      return NextResponse.json(
        { error: "접근 권한이 없습니다" },
        { status: 403 }
      );
    }

    // 팀이 있는 경우 삭제 불가
    const teamCount = await prisma.experienceTeam.count({
      where: { campaignId: params.id }
    });

    if (teamCount > 0) {
      return NextResponse.json(
        { error: "참여 중인 팀이 있는 공고는 삭제할 수 없습니다" },
        { status: 400 }
      );
    }

    // 공고 삭제
    await prisma.experienceCampaign.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("체험단 공고 삭제 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
