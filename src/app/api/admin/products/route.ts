import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/prisma";
import { getBaseUrl } from "@/server/url-helpers";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    throw new Error("관리자 권한이 필요합니다");
  }
  if (!user.adminType || !["SUPER", "MANAGER"].includes(user.adminType)) {
    throw new Error("관리자 권한이 필요합니다");
  }
  return user;
}

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
  missionType: z.enum(["TRAFFIC", "SAVE", "SHARE"]),
  unitPriceKrw: z.coerce.number().int().min(1).max(1_000_000),
  vatPercent: z.coerce.number().int().min(0).max(100).default(0),
  minOrderDays: z.coerce.number().int().min(1).max(365).default(7),
  isActive: z.coerce.boolean().default(true),
  marketingCopy: z.string().max(10_000).optional().or(z.literal("")),
  guideText: z.string().max(50_000).optional().or(z.literal("")),
  missionTemplateId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin();
    const form = await req.formData();

    const parsed = CreateSchema.safeParse({
      name: form.get("name"),
      missionType: form.get("missionType"),
      unitPriceKrw: form.get("unitPriceKrw"),
      vatPercent: form.get("vatPercent"),
      minOrderDays: form.get("minOrderDays"),
      isActive: form.get("isActive") === "on" || form.get("isActive") === "true",
      marketingCopy: form.get("marketingCopy"),
      guideText: form.get("guideText"),
      missionTemplateId: form.get("missionTemplateId") || undefined,
    });

    if (!parsed.success) {
      return NextResponse.redirect(new URL("/admin/products/new?error=invalid", baseUrl), 303);
    }

    const created = await prisma.product.create({
      data: {
        name: parsed.data.name,
        missionType: parsed.data.missionType,
        unitPriceKrw: parsed.data.unitPriceKrw,
        vatPercent: parsed.data.vatPercent,
        minOrderDays: parsed.data.minOrderDays,
        isActive: parsed.data.isActive,
        marketingCopy: parsed.data.marketingCopy || null,
        guideText: parsed.data.guideText || null,
        missionTemplateId: parsed.data.missionTemplateId || null,
        createdByAdminId: user.id,
      },
      select: { id: true },
    });

    console.log("상품 생성 성공:", created.id);

    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "ADMIN_PRODUCT_CREATED",
        targetType: "Product",
        targetId: created.id,
        payloadJson: parsed.data,
      },
    });

    console.log("감사 로그 생성 성공");

    return NextResponse.json({ success: true, productId: created.id });
  } catch (error) {
    if (error instanceof Error && error.message.includes("권한")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Admin product create failed:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}

