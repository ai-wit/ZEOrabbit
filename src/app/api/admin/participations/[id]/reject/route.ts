import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getBaseUrl } from "@/server/url-helpers";

const BodySchema = z.object({
  reason: z.string().min(1).max(200)
});

export async function POST(req: Request, ctx: { params: { id: string } }) {

  const baseUrl = getBaseUrl(req);
  
  const admin = await requireRole("ADMIN");
  const participationId = ctx.params.id;

  const form = await req.formData();
  const parsed = BodySchema.safeParse({
    reason: form.get("reason")
  });
  if (!parsed.success) {
    return NextResponse.redirect(new URL(`/admin/reviews/${participationId}`, baseUrl), 303);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const p = await tx.participation.findUnique({
        where: { id: participationId },
        select: {
          id: true,
          status: true,
          missionDayId: true,
          missionDay: { select: { quotaRemaining: true, quotaTotal: true } }
        }
      });
      if (!p) throw new Error("Not found");
      if (p.status !== "PENDING_REVIEW" && p.status !== "MANUAL_REVIEW") throw new Error("Invalid status");

      await tx.verificationResult.upsert({
        where: { participationId: p.id },
        update: {
          manualDecision: "REJECT",
          decidedByAdminId: admin.id,
          decidedAt: new Date()
        },
        create: {
          participationId: p.id,
          manualDecision: "REJECT",
          decidedByAdminId: admin.id,
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

      // Restore quota so the advertiser can still reach the daily target.
      // Note: We cap quotaRemaining to quotaTotal to prevent accidental overflow.
      const nextQuota = Math.min(p.missionDay.quotaRemaining + 1, p.missionDay.quotaTotal);
      await tx.missionDay.update({
        where: { id: p.missionDayId },
        data: { quotaRemaining: nextQuota }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          action: "ADMIN_REJECT_PARTICIPATION",
          targetType: "Participation",
          targetId: p.id,
          payloadJson: { reason: parsed.data.reason }
        }
      });
    });
  } catch {
    return NextResponse.redirect(new URL(`/admin/reviews/${participationId}`, baseUrl), 303);
  }

  return NextResponse.redirect(new URL(`/admin/reviews/${participationId}`, baseUrl), 303);
}


