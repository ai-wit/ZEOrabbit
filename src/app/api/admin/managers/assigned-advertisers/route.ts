import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.adminType !== "MANAGER") {
      return NextResponse.json(
        { error: "매니저 권한이 필요합니다" },
        { status: 403 }
      );
    }

    const managedAdvertisers = await prisma.advertiserManager.findMany({
      where: {
        managerId: user.id,
        isActive: true
      },
      include: {
        advertiser: {
          include: {
            user: { select: { name: true } }
          }
        }
      }
    });

    return NextResponse.json({
      advertisers: managedAdvertisers.map(am => ({
        advertiserId: am.advertiserId,
        advertiser: am.advertiser
      }))
    });
  } catch (error) {
    console.error("담당 광고주 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
