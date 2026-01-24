import { NextResponse } from "next/server";
import { requireRole } from "@/server/auth/require-user";
import { getBaseUrl } from "@/server/url-helpers";

export async function POST(req: Request) {

  // A안: 광고주는 캠페인을 직접 생성하지 않고, 상품 구매로 자동 생성합니다.
  const baseUrl = getBaseUrl(req);
  
  await requireRole("ADVERTISER");
  return NextResponse.redirect(new URL("/advertiser/products", baseUrl), 303);

}


