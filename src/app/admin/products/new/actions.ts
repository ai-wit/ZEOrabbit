"use server";

import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { z } from "zod";
import { redirect } from "next/navigation";

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
  missionType: z.enum(["TRAFFIC", "SAVE", "SHARE"]),
  unitPriceKrw: z.coerce.number().int().min(1).max(1_000_000),
  vatPercent: z.coerce.number().int().min(0).max(100).default(10),
  minOrderDays: z.coerce.number().int().min(1).max(365).default(7),
  isActive: z.coerce.boolean().default(true),
  marketingCopy: z.string().max(10_000).optional().or(z.literal("")),
  guideText: z.string().max(50_000).optional().or(z.literal("")),
  missionTemplateId: z.string().optional(),
});

export async function createProduct(formData: FormData) {
  const user = await requireRole("ADMIN");

  const parsed = CreateSchema.safeParse({
    name: formData.get("name"),
    missionType: formData.get("missionType"),
    unitPriceKrw: formData.get("unitPriceKrw"),
    vatPercent: formData.get("vatPercent"),
    minOrderDays: formData.get("minOrderDays"),
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
    marketingCopy: formData.get("marketingCopy"),
    guideText: formData.get("guideText"),
    missionTemplateId: formData.get("missionTemplateId") || "",
  });

  if (!parsed.success) {
    console.log("유효성 검사 실패:", parsed.error);
    throw new Error("입력 값이 올바르지 않습니다.");
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

  // 성공 시 목록 페이지로 리다이렉트
  redirect("/admin/products");
}
