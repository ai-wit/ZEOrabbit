import { NextResponse } from "next/server";
import { destroyCurrentSession } from "@/server/auth/session";
import { getBaseUrl } from "@/server/url-helpers";

export async function POST(req: Request) {
  await destroyCurrentSession();
  const baseUrl = getBaseUrl(req);
  return NextResponse.redirect(new URL("/", baseUrl), 303);
}


