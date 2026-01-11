import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireManager } from "@/server/auth/require-manager";

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const manager = await requireManager();
  const id = ctx.params.id;

  const order = await prisma.productOrder.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      startDate: true,
      endDate: true,
      dailyTarget: true,
      unitPriceKrw: true,
      budgetTotalKrw: true,
      vatAmountKrw: true,
      totalAmountKrw: true,
      paymentId: true,
      campaignId: true,
      createdAt: true,
      advertiser: { select: { id: true, user: { select: { name: true, email: true } } } },
      place: { select: { id: true, name: true } },
      product: { select: { id: true, name: true, missionType: true, guideText: true, marketingCopy: true } },
      campaign: {
        select: {
          id: true,
          name: true,
          status: true,
          missionType: true,
          dailyTarget: true,
          startDate: true,
          endDate: true,
          rewardKrw: true,
          missionText: true,
          buttons: { orderBy: { sortOrder: "asc" }, select: { id: true, label: true, url: true, sortOrder: true } }
        }
      }
    }
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const assignment = await prisma.advertiserManager.findFirst({
    where: { managerId: manager.id, advertiserId: order.advertiser.id, isActive: true },
    select: { id: true }
  });
  if (!assignment) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ order });
}


