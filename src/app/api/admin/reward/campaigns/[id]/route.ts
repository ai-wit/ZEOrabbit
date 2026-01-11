import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireManager } from "@/server/auth/require-manager";

const ButtonSchema = z.object({
  label: z.string().min(1).max(30),
  url: z.string().url().refine((u) => u.startsWith("http://") || u.startsWith("https://"), {
    message: "URL must start with http:// or https://"
  }),
  sortOrder: z.number().int().min(0).max(1000).default(0)
});

const UpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  missionText: z.string().max(10_000).nullable().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  buttons: z.array(ButtonSchema).max(10).optional()
});

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const manager = await requireManager();
  const campaignId = ctx.params.id;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      advertiserId: true,
      name: true,
      missionType: true,
      dailyTarget: true,
      startDate: true,
      endDate: true,
      rewardKrw: true,
      status: true,
      missionText: true,
      buttons: { orderBy: { sortOrder: "asc" }, select: { id: true, label: true, url: true, sortOrder: true } },
      place: { select: { name: true } }
    }
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const assignment = await prisma.advertiserManager.findFirst({
    where: { managerId: manager.id, advertiserId: campaign.advertiserId, isActive: true },
    select: { id: true }
  });
  if (!assignment) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const order = await prisma.productOrder.findFirst({
    where: { campaignId: campaign.id },
    select: { id: true, startDate: true, endDate: true, status: true }
  });
  if (!order) return NextResponse.json({ error: "Order linkage required" }, { status: 400 });

  return NextResponse.json({ campaign, order });
}

export async function PUT(req: NextRequest, ctx: { params: { id: string } }) {
  const manager = await requireManager();
  const campaignId = ctx.params.id;

  const json = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, advertiserId: true, startDate: true, endDate: true }
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const assignment = await prisma.advertiserManager.findFirst({
    where: { managerId: manager.id, advertiserId: campaign.advertiserId, isActive: true },
    select: { id: true }
  });
  if (!assignment) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const order = await prisma.productOrder.findFirst({
    where: { campaignId: campaign.id },
    select: { startDate: true, endDate: true }
  });
  if (!order) return NextResponse.json({ error: "Order linkage required" }, { status: 400 });

  const nextStart = parsed.data.startDate ?? campaign.startDate;
  const nextEnd = parsed.data.endDate ?? campaign.endDate;
  if (nextStart.getTime() > nextEnd.getTime()) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }
  if (nextStart < order.startDate || nextEnd > order.endDate) {
    return NextResponse.json({ error: "Date out of purchase bounds" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const c = await tx.campaign.update({
      where: { id: campaign.id },
      data: {
        ...(parsed.data.name ? { name: parsed.data.name } : {}),
        ...(parsed.data.missionText !== undefined ? { missionText: parsed.data.missionText } : {}),
        ...(parsed.data.startDate ? { startDate: nextStart } : {}),
        ...(parsed.data.endDate ? { endDate: nextEnd } : {})
      },
      select: { id: true }
    });

    if (parsed.data.buttons) {
      await tx.campaignButton.deleteMany({ where: { campaignId: campaign.id } });
      if (parsed.data.buttons.length > 0) {
        await tx.campaignButton.createMany({
          data: parsed.data.buttons.map((b) => ({
            campaignId: campaign.id,
            label: b.label,
            url: b.url,
            sortOrder: b.sortOrder ?? 0
          }))
        });
      }
    }

    await tx.auditLog.create({
      data: {
        actorUserId: manager.id,
        action: "MANAGER_UPDATE_REWARD_CAMPAIGN",
        targetType: "Campaign",
        targetId: campaign.id
      }
    });

    return c;
  });

  return NextResponse.json({ campaign: updated });
}


