import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/prisma";

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

const UpdateSchema = z.object({
  name: z.string().min(1).max(100),
  unitPriceKrw: z.coerce.number().int().min(1).max(1_000_000),
  vatPercent: z.coerce.number().int().min(0).max(100),
  minOrderDays: z.coerce.number().int().min(1).max(365),
  isActive: z.coerce.boolean(),
  marketingCopy: z.string().max(10_000).optional().or(z.literal("")),
  guideText: z.string().max(50_000).optional().or(z.literal("")),
  missionTemplateId: z.string().optional(),
});

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const user = await requireAdmin();
    const productId = ctx.params.id;
    const form = await req.formData();

    const parsed = UpdateSchema.safeParse({
      name: form.get("name"),
      unitPriceKrw: form.get("unitPriceKrw"),
      vatPercent: form.get("vatPercent"),
      minOrderDays: form.get("minOrderDays"),
      isActive: form.get("isActive") === "on" || form.get("isActive") === "true",
      marketingCopy: form.get("marketingCopy"),
      guideText: form.get("guideText"),
      missionTemplateId: form.get("missionTemplateId") || undefined,
    });

    if (!parsed.success) {
      const errorMessages = parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ');
      return NextResponse.redirect(new URL(`/admin/products/${productId}?error=${encodeURIComponent(errorMessages)}`, req.url), 303);
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        name: parsed.data.name,
        unitPriceKrw: parsed.data.unitPriceKrw,
        vatPercent: parsed.data.vatPercent,
        minOrderDays: parsed.data.minOrderDays,
        isActive: parsed.data.isActive,
        marketingCopy: parsed.data.marketingCopy || null,
        guideText: parsed.data.guideText || null,
        missionTemplateId: parsed.data.missionTemplateId || null,
      },
      select: { id: true },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "ADMIN_PRODUCT_UPDATED",
        targetType: "Product",
        targetId: updated.id,
        payloadJson: parsed.data,
      },
    });

    return NextResponse.redirect(new URL(`/admin/products/${productId}?saved=1`, req.url), 303);
  } catch (error) {
    if (error instanceof Error && error.message.includes("권한")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Admin product update failed:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}

