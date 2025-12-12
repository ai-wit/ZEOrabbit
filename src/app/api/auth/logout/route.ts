import { NextResponse } from "next/server";
import { destroyCurrentSession } from "@/server/auth/session";

export async function POST(req: Request) {
  await destroyCurrentSession();
  return NextResponse.redirect(new URL("/", req.url), 303);
}


