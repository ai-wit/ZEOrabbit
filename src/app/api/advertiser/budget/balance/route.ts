import { NextResponse } from "next/server";
import { requireRole } from "@/server/auth/require-user";
import { getAdvertiserProfileIdByUserId } from "@/server/advertiser/advertiser-profile";
import { getAdvertiserBudgetBalanceKrw } from "@/server/advertiser/balance";

export async function GET() {
  try {
    const user = await requireRole("ADVERTISER");
    const advertiserId = await getAdvertiserProfileIdByUserId(user.id);
    const balanceKrw = await getAdvertiserBudgetBalanceKrw(advertiserId);

    return NextResponse.json({ balanceKrw });
  } catch (error) {
    console.error("Failed to fetch advertiser budget balance:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

