import { NextResponse } from "next/server";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getAdvertiserProfileIdByUserId } from "@/server/advertiser/advertiser-profile";
import { eachDateUtcInclusive, toDateOnlyUtc } from "@/server/date/date-only";

export async function POST(
  req: Request,
  ctx: { params: { campaignId: string } }
) {
  // NOTE: 캠페인 활성화/비활성화는 매니저가 수행합니다.
  await requireRole("ADVERTISER");
  return NextResponse.redirect(new URL("/advertiser/campaigns", req.url), 303);
}


