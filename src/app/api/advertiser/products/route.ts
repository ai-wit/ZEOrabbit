import { NextResponse } from "next/server";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";

export async function GET() {
  try {
    await requireRole("ADVERTISER");

    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        missionType: true,
        unitPriceKrw: true,
        vatPercent: true,
        minOrderDays: true,
        marketingCopy: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error("상품 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}