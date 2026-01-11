import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { MissionLimitsPolicySchema, PricingPolicySchema, PayoutPolicySchema } from "@/server/policy/types";

export async function GET() {
  const user = await requireRole("ADMIN");
  if (user.adminType === "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const policies = await prisma.policy.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      key: true,
      payloadJson: true,
      createdAt: true,
      version: true,
      isActive: true
    }
  });

  return NextResponse.json({ policies });
}

export async function POST(req: NextRequest) {
  const user = await requireRole("ADMIN");
  if (user.adminType === "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { key, payload } = await req.json();

    // 정책 타입 검증
    let validatedPayload;
    if (key === "MISSION_LIMITS") {
      validatedPayload = MissionLimitsPolicySchema.parse(payload);
    } else if (key === "PRICING") {
      validatedPayload = PricingPolicySchema.parse(payload);
    } else if (key === "PAYOUT") {
      validatedPayload = PayoutPolicySchema.parse(payload);
    } else {
      return NextResponse.json({ error: "Invalid policy key" }, { status: 400 });
    }

    // 트랜잭션으로 기존 정책 비활성화 후 새 정책 생성
    const result = await prisma.$transaction(async (tx) => {
      // 기존 활성 정책 비활성화
      await tx.policy.updateMany({
        where: { key, isActive: true },
        data: { isActive: false }
      });

      // 새 정책 생성
      const newPolicy = await tx.policy.create({
        data: {
          key,
          payloadJson: validatedPayload,
          isActive: true
        },
        select: {
          id: true,
          key: true,
          payloadJson: true,
          createdAt: true,
          version: true,
          isActive: true
        }
      });

      // 감사 로그 기록
      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: "POLICY_UPDATED",
          targetType: "Policy",
          targetId: newPolicy.id
        }
      });

      return newPolicy;
    });

    return NextResponse.json({ policy: result });
  } catch (error) {
    console.error("Policy creation error:", error);
    return NextResponse.json({ error: "Invalid policy data" }, { status: 400 });
  }
}
