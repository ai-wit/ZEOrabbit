import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getAdvertiserProfileIdByUserId } from "@/server/advertiser/advertiser-profile";
import { calculateRewardKrw } from "@/server/advertiser/pricing";
import { getPricingPolicy } from "@/server/policy/get-policy";

const CreateCampaignSchema = z.object({
  placeId: z.string().min(1),
  name: z.string().min(1).max(255),
  startDate: z.string().min(10).max(10), // YYYY-MM-DD
  endDate: z.string().min(10).max(10),
  dailyTarget: z.coerce.number().int().min(1).max(1_000_000),
  unitPriceKrw: z.coerce.number().int().min(1).max(1_000_000)
});

function parseDateInput(value: string): Date | null {
  // Interpret YYYY-MM-DD as local date start; we normalize later.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

export async function POST(req: Request) {
  const user = await requireRole("ADVERTISER");
  const advertiserId = await getAdvertiserProfileIdByUserId(user.id);

  const form = await req.formData();
  const parsed = CreateCampaignSchema.safeParse({
    placeId: form.get("placeId"),
    name: form.get("name"),
    startDate: form.get("startDate"),
    endDate: form.get("endDate"),
    dailyTarget: form.get("dailyTarget"),
    unitPriceKrw: form.get("unitPriceKrw")
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL("/advertiser/campaigns/new", req.url), 303);
  }

  const start = parseDateInput(parsed.data.startDate);
  const end = parseDateInput(parsed.data.endDate);
  if (!start || !end || start.getTime() > end.getTime()) {
    return NextResponse.redirect(new URL("/advertiser/campaigns/new", req.url), 303);
  }

  const place = await prisma.place.findFirst({
    where: { id: parsed.data.placeId, advertiserId },
    select: { id: true }
  });
  if (!place) return NextResponse.redirect(new URL("/advertiser/campaigns/new", req.url), 303);

  const pricing = await getPricingPolicy();
  const rewardRatio = pricing?.rewardRatioByMissionType?.TRAFFIC ?? 0.25;
  const minUnit = pricing?.unitPriceMinKrwByMissionType?.TRAFFIC ?? 1;
  const maxUnit = pricing?.unitPriceMaxKrwByMissionType?.TRAFFIC ?? 1_000_000;
  if (parsed.data.unitPriceKrw < minUnit || parsed.data.unitPriceKrw > maxUnit) {
    return NextResponse.redirect(new URL("/advertiser/campaigns/new", req.url), 303);
  }
  const rewardKrw = calculateRewardKrw({ unitPriceKrw: parsed.data.unitPriceKrw, rewardRatio });
  const totalDays = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  const budgetTotalKrw = parsed.data.dailyTarget * totalDays * parsed.data.unitPriceKrw;

  const budgetAgg = await prisma.budgetLedger.aggregate({
    where: { advertiserId },
    _sum: { amountKrw: true }
  });
  const budgetBalance = budgetAgg._sum.amountKrw ?? 0;
  if (budgetBalance < budgetTotalKrw) {
    return NextResponse.redirect(new URL("/advertiser/billing", req.url), 303);
  }

  await prisma.campaign.create({
    data: {
      advertiserId,
      placeId: place.id,
      name: parsed.data.name,
      missionType: "TRAFFIC",
      dailyTarget: parsed.data.dailyTarget,
      startDate: start,
      endDate: end,
      unitPriceKrw: parsed.data.unitPriceKrw,
      rewardKrw,
      budgetTotalKrw,
      status: "DRAFT"
    }
  });

  return NextResponse.redirect(new URL("/advertiser/campaigns", req.url), 303);
}


