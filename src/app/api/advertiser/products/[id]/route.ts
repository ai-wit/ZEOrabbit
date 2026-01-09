import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getAdvertiserProfileIdByUserId } from "@/server/advertiser/advertiser-profile";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole("ADVERTISER");
    const advertiserId = await getAdvertiserProfileIdByUserId(user.id);

    const [product, places] = await Promise.all([
      prisma.product.findFirst({
        where: { id: params.id, isActive: true },
        select: {
          id: true,
          name: true,
          missionType: true,
          unitPriceKrw: true,
          vatPercent: true,
          minOrderDays: true,
          marketingCopy: true,
          guideText: true,
        },
      }),
      prisma.place.findMany({
        where: { advertiserId },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true },
      }),
    ]);

    if (!product) {
      return NextResponse.json(
        { error: "상품을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      product,
      places,
    });
  } catch (error) {
    console.error("상품 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}