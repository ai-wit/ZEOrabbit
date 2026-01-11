import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireManager } from "@/server/auth/require-manager";
import { getPricingPolicy } from "@/server/policy/get-policy";
import { calculateRewardKrw } from "@/server/advertiser/pricing";

const CreateSchema = z.object({
  productOrderId: z.string().min(1)
});

export async function POST(req: NextRequest) {
  const manager = await requireManager();
  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
  }

  const order = await prisma.productOrder.findUnique({
    where: { id: parsed.data.productOrderId },
    select: {
      id: true,
      status: true,
      advertiserId: true,
      placeId: true,
      startDate: true,
      endDate: true,
      dailyTarget: true,
      unitPriceKrw: true,
      budgetTotalKrw: true,
      campaignId: true,
      product: {
        select: {
          id: true,
          name: true,
          missionType: true,
          guideText: true,
          marketingCopy: true
        }
      }
    }
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "FULFILLED") {
    return NextResponse.json({ error: "Order not fulfilled" }, { status: 400 });
  }
  if (order.campaignId) {
    return NextResponse.json({ error: "Campaign already registered" }, { status: 409 });
  }

  const assignment = await prisma.advertiserManager.findFirst({
    where: { managerId: manager.id, advertiserId: order.advertiserId, isActive: true },
    select: { id: true }
  });
  if (!assignment) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const pricing = await getPricingPolicy();
  const rewardRatio =
    pricing?.rewardRatioByMissionType?.[order.product.missionType] ??
    (order.product.missionType === "TRAFFIC" ? 0.25 : 0.25);
  const rewardKrw = calculateRewardKrw({ unitPriceKrw: order.unitPriceKrw, rewardRatio });

  const created = await prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.create({
      data: {
        advertiserId: order.advertiserId,
        placeId: order.placeId,
        name: order.product.name,
        missionType: order.product.missionType,
        dailyTarget: order.dailyTarget,
        startDate: order.startDate,
        endDate: order.endDate,
        unitPriceKrw: order.unitPriceKrw,
        rewardKrw,
        budgetTotalKrw: order.budgetTotalKrw,
        status: "DRAFT",
        missionText: order.product.guideText ?? order.product.marketingCopy ?? null
      },
      select: { id: true }
    });

    await tx.productOrder.update({
      where: { id: order.id },
      data: { campaignId: campaign.id }
    });

    await tx.auditLog.create({
      data: {
        actorUserId: manager.id,
        action: "MANAGER_REGISTER_REWARD_CAMPAIGN",
        targetType: "Campaign",
        targetId: campaign.id,
        payloadJson: { productOrderId: order.id }
      }
    });

    return campaign;
  });

  return NextResponse.json({ campaign: created }, { status: 201 });
}


