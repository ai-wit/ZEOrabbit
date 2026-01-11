import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireManager } from "@/server/auth/require-manager";
import { eachDateUtcInclusive, toDateOnlyUtc } from "@/server/date/date-only";

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const manager = await requireManager();
  const campaignId = ctx.params.id;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      advertiserId: true,
      startDate: true,
      endDate: true,
      dailyTarget: true,
      status: true
    }
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const assignment = await prisma.advertiserManager.findFirst({
    where: { managerId: manager.id, advertiserId: campaign.advertiserId, isActive: true },
    select: { id: true }
  });
  if (!assignment) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Enforce purchase date bounds: campaign must be linked to an order and within its window.
  const order = await prisma.productOrder.findFirst({
    where: { campaignId: campaign.id },
    select: { startDate: true, endDate: true }
  });
  if (!order) return NextResponse.json({ error: "Order linkage required" }, { status: 400 });
  if (campaign.startDate < order.startDate || campaign.endDate > order.endDate) {
    return NextResponse.json({ error: "Campaign date out of order bounds" }, { status: 400 });
  }

  if (campaign.status !== "DRAFT" && campaign.status !== "PAUSED") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
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
        update: { status: "ACTIVE" },
        create: {
          campaignId: campaign.id,
          date: dateOnly,
          quotaTotal: campaign.dailyTarget,
          quotaRemaining: campaign.dailyTarget,
          status: "ACTIVE"
        }
      });
    }

    await tx.auditLog.create({
      data: {
        actorUserId: manager.id,
        action: "MANAGER_ACTIVATE_REWARD_CAMPAIGN",
        targetType: "Campaign",
        targetId: campaign.id
      }
    });
  });

  return NextResponse.json({ success: true });
}


