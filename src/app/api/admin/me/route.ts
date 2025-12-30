import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "관리자 권한이 필요합니다" },
        { status: 403 }
      );
    }

    if (!user.adminType || !["SUPER", "MANAGER"].includes(user.adminType)) {
      return NextResponse.json(
        { error: "관리자 권한이 필요합니다" },
        { status: 403 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("관리자 정보 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
