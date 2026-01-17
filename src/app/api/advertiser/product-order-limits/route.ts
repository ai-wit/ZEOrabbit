import { NextRequest, NextResponse } from "next/server";
import { getProductOrderLimitsPolicy } from "@/server/policy/get-policy";

export async function GET(request: NextRequest) {
  try {
    const policy = await getProductOrderLimitsPolicy();

    // 정책이 없으면 기본값 반환
    const limits = policy || {
      maxAdditionalDays: 300,
      maxDailyTarget: 1000
    };

    return NextResponse.json(limits);
  } catch (error) {
    console.error("Failed to fetch product order limits:", error);
    // 에러가 발생해도 기본값 반환
    return NextResponse.json({
      maxAdditionalDays: 300,
      maxDailyTarget: 1000
    });
  }
}
