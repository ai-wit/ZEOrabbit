import { NextResponse } from "next/server";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getAdvertiserProfileIdByUserId } from "@/server/advertiser/advertiser-profile";
import { eachDateUtcInclusive, toDateOnlyUtc } from "@/server/date/date-only";

export async function POST(
  req: Request,
  ctx: { params: { campaignId: string } }
) {
  const user = await requireRole("ADVERTISER");
  const advertiserId = await getAdvertiserProfileIdByUserId(user.id);
  const campaignId = ctx.params.campaignId;

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, advertiserId },
    select: { id: true, startDate: true, endDate: true, dailyTarget: true, status: true }
  });
  if (!campaign) return NextResponse.redirect(new URL("/advertiser/campaigns", req.url), 303);

  if (campaign.status !== "DRAFT" && campaign.status !== "PAUSED") {
    return NextResponse.redirect(new URL("/advertiser/campaigns", req.url), 303);
  }

  await prisma.$transaction(async (tx) => {
    await tx.campaign.update({
      where: { id: campaign.id },
      data: { status: "ACTIVE" }
    });

    for (const date of eachDateUtcInclusive(campaign.startDate, campaign.endDate)) {
      const dateOnly = toDateOnlyUtc(date);
      await tx.missionDay.upsert({
        where: { campaignId_date: { campaignId: campaign.id, date: dateOnly } },
        update: {
          status: "ACTIVE"
        },
        create: {
          campaignId: campaign.id,
          date: dateOnly,
          quotaTotal: campaign.dailyTarget,
          quotaRemaining: campaign.dailyTarget,
          status: "ACTIVE"
        }
      });
    }
  });

  return NextResponse.redirect(new URL("/advertiser/campaigns", req.url), 303);
}


