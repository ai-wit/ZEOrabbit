import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireManager } from "@/server/auth/require-manager";

const BodySchema = z.object({
  reason: z.string().min(1).max(200)
});

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const manager = await requireManager();
  const participationId = ctx.params.id;

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const p = await tx.participation.findUnique({
        where: { id: participationId },
        select: {
          id: true,
          status: true,
          missionDayId: true,
          missionDay: { select: { quotaRemaining: true, quotaTotal: true, campaign: { select: { advertiserId: true } } } }
        }
      });
      if (!p) throw new Error("Not found");
      if (p.status !== "PENDING_REVIEW" && p.status !== "MANUAL_REVIEW") throw new Error("Invalid status");

      const rel = await tx.advertiserManager.findFirst({
        where: { managerId: manager.id, advertiserId: p.missionDay.campaign.advertiserId, isActive: true },
        select: { id: true }
      });
      if (!rel) throw new Error("Forbidden");

      await tx.verificationResult.upsert({
        where: { participationId: p.id },
        update: {
          manualDecision: "REJECT",
          decidedByAdminId: manager.id,
          decidedAt: new Date()
        },
        create: {
          participationId: p.id,
          manualDecision: "REJECT",
          decidedByAdminId: manager.id,
          decidedAt: new Date()
        }
      });

      await tx.participation.update({
        where: { id: p.id },
        data: {
          status: "REJECTED",
          decidedAt: new Date(),
          failureReason: parsed.data.reason
        }
      });

      const nextQuota = Math.min(p.missionDay.quotaRemaining + 1, p.missionDay.quotaTotal);
      await tx.missionDay.update({
        where: { id: p.missionDayId },
        data: { quotaRemaining: nextQuota }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: manager.id,
          action: "MANAGER_REJECT_PARTICIPATION",
          targetType: "Participation",
          targetId: p.id,
          payloadJson: { reason: parsed.data.reason }
        }
      });
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}


