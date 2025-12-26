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

// POST /api/admin/experience-campaigns/[id]/generate-report - 리포트 생성
export async function POST(
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
        managerId: user.id
      },
      include: {
        advertiser: { select: { user: { select: { name: true } } } },
        place: { select: { name: true } },
        teams: {
          include: {
            memberships: { where: { status: "APPROVED" } },
            submission: true
          }
        }
      }
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "체험단 공고에 대한 권한이 없습니다" },
        { status: 403 }
      );
    }

    // 체험단이 종료되었는지 확인
    if (campaign.status !== "ENDED") {
      return NextResponse.json(
        { error: "종료된 체험단만 리포트를 생성할 수 있습니다" },
        { status: 400 }
      );
    }

    // 이미 리포트가 존재하는지 확인
    const existingReport = await prisma.experienceReport.findUnique({
      where: { campaignId }
    });

    if (existingReport) {
      return NextResponse.json(
        { error: "이미 리포트가 생성되었습니다" },
        { status: 409 }
      );
    }

    // 통계 데이터 수집
    const totalTeams = campaign.teams.length;
    const activeTeams = campaign.teams.filter(team => team.status === "ACTIVE").length;
    const totalMembers = campaign.teams.reduce((sum, team) => sum + team.memberships.length, 0);
    const submittedTeams = campaign.teams.filter(team => team.submission).length;
    const approvedSubmissions = campaign.teams.filter(team =>
      team.submission && team.submission.status === "APPROVED"
    ).length;

    const statistics = {
      totalTeams,
      activeTeams,
      totalMembers,
      submittedTeams,
      approvedSubmissions,
      submissionRate: totalTeams > 0 ? (submittedTeams / totalTeams * 100) : 0,
      approvalRate: submittedTeams > 0 ? (approvedSubmissions / submittedTeams * 100) : 0
    };

    // 리포트 생성
    const report = await prisma.experienceReport.create({
      data: {
        campaignId,
        generatedBy: user.id,
        title: `${campaign.advertiser.user.name} - ${campaign.place.name} 체험단 리포트`,
        statistics,
        summary: `체험단 기간 동안 ${totalTeams}개 팀이 참여하였으며, ${submittedTeams}개 팀이 자료를 제출하였습니다.`,
        insights: `참여율 ${(submittedTeams / totalTeams * 100).toFixed(1)}%, 승인율 ${(approvedSubmissions / submittedTeams * 100).toFixed(1)}%로 체험단이 성공적으로 진행되었습니다.`,
        recommendations: totalMembers > 0 ? "체험단 참여자들의 피드백을 바탕으로 매장 개선에 활용하시기 바랍니다." : ""
      }
    });

    return NextResponse.json({
      message: "리포트가 성공적으로 생성되었습니다",
      report
    });
  } catch (error) {
    console.error("리포트 생성 실패:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
