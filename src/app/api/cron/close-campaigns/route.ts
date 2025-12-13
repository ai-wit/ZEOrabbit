import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { toDateOnlyUtc } from "@/server/date/date-only";

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

  const today = toDateOnlyUtc(new Date());

  const result = await prisma.$transaction(async (tx) => {
    const campaignsEnded = await tx.campaign.updateMany({
      where: {
        status: { in: ["ACTIVE", "PAUSED"] },
        endDate: { lt: today }
      },
      data: { status: "ENDED" }
    });

    const missionDaysEnded = await tx.missionDay.updateMany({
      where: {
        status: { in: ["ACTIVE", "PAUSED"] },
        date: { lt: today }
      },
      data: { status: "ENDED" }
    });

    await tx.auditLog.create({
      data: {
        actorUserId: null,
        action: "CRON_CLOSE_CAMPAIGNS",
        payloadJson: {
          today,
          campaignsEnded: campaignsEnded.count,
          missionDaysEnded: missionDaysEnded.count
        }
      }
    });

    return { campaignsEnded: campaignsEnded.count, missionDaysEnded: missionDaysEnded.count };
  });

  return NextResponse.json({ ok: true, ...result });
}


