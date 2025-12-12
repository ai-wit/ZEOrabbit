import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({ user });
}


