import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { toDateOnlyUtc } from "@/server/date/date-only";

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  await requireRole("MEMBER");
  const today = toDateOnlyUtc(new Date());

  const campaign = await prisma.campaign.findUnique({
    where: { id: ctx.params.id },
    select: {
      id: true,
      name: true,
      missionType: true,
      rewardKrw: true,
      startDate: true,
      endDate: true,
      status: true,
      missionText: true,
      place: { select: { name: true } },
      buttons: { orderBy: { sortOrder: "asc" }, select: { id: true, label: true, url: true, sortOrder: true } },
      missionDays: {
        where: { date: today },
        select: { id: true, quotaRemaining: true, quotaTotal: true, status: true }
      }
    }
  });

  if (!campaign || campaign.status !== "ACTIVE") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ campaign: { ...campaign, todayMissionDay: campaign.missionDays[0] ?? null, missionDays: undefined } });
}


