import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireManager } from "@/server/auth/require-manager";

const QuerySchema = z.object({
  advertiserId: z.string().optional()
});

export async function GET(req: NextRequest) {
  const manager = await requireManager();

  const parsed = QuerySchema.safeParse({
    advertiserId: new URL(req.url).searchParams.get("advertiserId") ?? undefined
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const managed = await prisma.advertiserManager.findMany({
    where: { managerId: manager.id, isActive: true },
    select: { advertiserId: true }
  });
  const allowedAdvertiserIds = new Set(managed.map((m) => m.advertiserId));
  if (allowedAdvertiserIds.size === 0) return NextResponse.json({ orders: [] });

  const advertiserId = parsed.data.advertiserId;
  if (advertiserId && !allowedAdvertiserIds.has(advertiserId)) {
    return NextResponse.json({ orders: [] });
  }

  const orders = await prisma.productOrder.findMany({
    where: {
      advertiserId: advertiserId ? advertiserId : { in: Array.from(allowedAdvertiserIds) }
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      status: true,
      startDate: true,
      endDate: true,
      dailyTarget: true,
      totalAmountKrw: true,
      paymentId: true,
      campaignId: true,
      createdAt: true,
      campaign: {
        select: {
          id: true,
          status: true
        }
      },
      advertiser: { select: { id: true, user: { select: { name: true, email: true } } } },
      place: { select: { id: true, name: true } },
      product: { select: { id: true, name: true, missionType: true } }
    }
  });

  return NextResponse.json({ orders });
}


