import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireManager } from "@/server/auth/require-manager";

const QuerySchema = z.object({
  status: z.string().optional()
});

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const manager = await requireManager();
  const campaignId = ctx.params.id;

  const parsed = QuerySchema.safeParse({
    status: new URL(req.url).searchParams.get("status") ?? undefined
  });
  if (!parsed.success) return NextResponse.json({ error: "Invalid query" }, { status: 400 });

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { advertiserId: true }
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const assignment = await prisma.advertiserManager.findFirst({
    where: { managerId: manager.id, advertiserId: campaign.advertiserId, isActive: true },
    select: { id: true }
  });
  if (!assignment) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const status = parsed.data.status;
  const allowed = new Set(["PENDING_REVIEW", "MANUAL_REVIEW", "APPROVED", "REJECTED", "IN_PROGRESS"]);
  const whereStatus = status && allowed.has(status) ? (status as any) : undefined;

  const items = await prisma.participation.findMany({
    where: {
      ...(whereStatus ? { status: whereStatus } : { status: { in: ["PENDING_REVIEW", "MANUAL_REVIEW"] } }),
      missionDay: { campaignId }
    },
    orderBy: { submittedAt: "desc" },
    take: 100,
    select: {
      id: true,
      status: true,
      submittedAt: true,
      decidedAt: true,
      failureReason: true,
      proofText: true,
      rewarder: { select: { user: { select: { email: true, name: true } } } },
      missionDay: { select: { date: true } },
      evidences: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, type: true, fileRef: true, createdAt: true }
      }
    }
  });

  return NextResponse.json({ participations: items });
}


