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
    // 종료된 체험단의 PENDING 상태 멤버십들을 만료 처리
    const membershipsExpired = await tx.teamMembership.updateMany({
      where: {
        status: "PENDING",
        team: {
          experienceCampaign: {
            status: "ENDED",
            endDate: { lt: now }
          }
        }
      },
      data: {
        status: "EXPIRED",
        decidedAt: now,
        failureReason: "체험단 기간 종료로 인한 자동 만료"
      }
    });

    // 감사 로그 기록
    await tx.auditLog.create({
      data: {
        actorUserId: null,
        action: "CRON_EXPIRE_EXPERIENCE_MEMBERSHIPS",
        payloadJson: {
          executedAt: now.toISOString(),
          membershipsExpired: membershipsExpired.count
        }
      }
    });

    return { membershipsExpired: membershipsExpired.count };
  });

  return NextResponse.json({ ok: true, ...result });
}
