import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireManager } from "@/server/auth/require-manager";
import { toDateOnlyUtc } from "@/server/date/date-only";

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const manager = await requireManager();
  const campaignId = ctx.params.id;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, advertiserId: true, status: true }
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const assignment = await prisma.advertiserManager.findFirst({
    where: { managerId: manager.id, advertiserId: campaign.advertiserId, isActive: true },
    select: { id: true }
  });
  if (!assignment) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (campaign.status !== "ACTIVE") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const today = toDateOnlyUtc(new Date());

  await prisma.$transaction(async (tx) => {
    await tx.campaign.update({
      where: { id: campaign.id },
      data: { status: "PAUSED" }
    });

    await tx.missionDay.updateMany({
      where: { campaignId: campaign.id, date: { gte: today }, status: "ACTIVE" },
      data: { status: "PAUSED" }
    });

    await tx.auditLog.create({
      data: {
        actorUserId: manager.id,
        action: "MANAGER_PAUSE_REWARD_CAMPAIGN",
        targetType: "Campaign",
        targetId: campaign.id
      }
    });
  });

  return NextResponse.json({ success: true });
}


