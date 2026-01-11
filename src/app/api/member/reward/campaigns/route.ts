import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { toDateOnlyUtc } from "@/server/date/date-only";

export async function GET(req: NextRequest) {
  await requireRole("MEMBER");
  const today = toDateOnlyUtc(new Date());

  const campaigns = await prisma.campaign.findMany({
    where: {
      status: "ACTIVE",
      startDate: { lte: today },
      endDate: { gte: today }
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      missionType: true,
      rewardKrw: true,
      startDate: true,
      endDate: true,
      missionText: true,
      place: { select: { name: true } },
      missionDays: {
        where: { date: today },
        select: { id: true, quotaRemaining: true, quotaTotal: true, status: true }
      },
      buttons: { orderBy: { sortOrder: "asc" }, select: { id: true, label: true, url: true, sortOrder: true } }
    }
  });

  return NextResponse.json({
    campaigns: campaigns.map((c) => ({
      ...c,
      todayMissionDay: c.missionDays[0] ?? null,
      missionDays: undefined
    }))
  });
}


