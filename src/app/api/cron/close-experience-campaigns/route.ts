import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const provided = url.searchParams.get("secret");
  const expected = process.env.CRON_SECRET;
  const isVercelCron = req.headers.get("x-vercel-cron") === "1" || req.headers.has("x-vercel-cron");

  if (process.env.NODE_ENV === "production") {
    if (!isVercelCron && (!expected || !provided || provided !== expected)) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    // 종료된 체험단 공고들 조회
    const endedCampaigns = await tx.experienceCampaign.findMany({
      where: {
        status: { in: ["ACTIVE", "PAUSED"] },
        endDate: { lt: now }
      },
      include: {
        manager: { select: { id: true } },
        teams: {
          include: {
            memberships: { where: { status: "APPROVED" } },
            submission: true
          }
        }
      }
    });

    // 체험단 공고들 종료 처리
    const campaignsClosed = await tx.experienceCampaign.updateMany({
      where: {
        status: { in: ["ACTIVE", "PAUSED"] },
        endDate: { lt: now }
      },
      data: { status: "ENDED" }
    });

    // 각 종료된 체험단에 대해 리포트 생성
    const reportsGenerated = [];
    for (const campaign of endedCampaigns) {
      // 이미 리포트가 있는지 확인
      const existingReport = await tx.experienceReport.findUnique({
        where: { campaignId: campaign.id }
      });

      if (!existingReport) {
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
        const report = await tx.experienceReport.create({
          data: {
            campaignId: campaign.id,
            generatedBy: campaign.manager.id,
            title: `${campaign.title} - 체험단 리포트`,
            statistics,
            summary: `체험단 기간 동안 ${totalTeams}개 팀이 참여하였으며, ${submittedTeams}개 팀이 자료를 제출하였습니다.`,
            insights: `참여율 ${(submittedTeams / totalTeams * 100).toFixed(1)}%, 승인율 ${(approvedSubmissions / submittedTeams * 100).toFixed(1)}%로 체험단이 진행되었습니다.`,
            recommendations: totalMembers > 0 ? "참여자들의 피드백을 바탕으로 매장 개선에 활용하시기 바랍니다." : ""
          }
        });

        reportsGenerated.push(report.id);
      }
    }

    // 감사 로그 기록
    await tx.auditLog.create({
      data: {
        actorUserId: null,
        action: "CRON_CLOSE_EXPERIENCE_CAMPAIGNS",
        payloadJson: {
          executedAt: now.toISOString(),
          campaignsClosed: campaignsClosed.count,
          reportsGenerated: reportsGenerated.length,
          campaignIds: endedCampaigns.map(c => c.id)
        }
      }
    });

    return {
      campaignsClosed: campaignsClosed.count,
      reportsGenerated: reportsGenerated.length
    };
  });

  return NextResponse.json({ ok: true, ...result });
}
