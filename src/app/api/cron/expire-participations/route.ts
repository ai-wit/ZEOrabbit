import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const provided = url.searchParams.get("secret");
  const expected = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === "production") {
    if (!expected || !provided || provided !== expected) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  const now = new Date();

  const expired = await prisma.participation.findMany({
    where: {
      status: "IN_PROGRESS",
      expiresAt: { lt: now }
    },
    select: { id: true, missionDayId: true }
  });

  if (expired.length === 0) {
    return NextResponse.json({ ok: true, expired: 0, restored: 0 });
  }

  const byMissionDay = new Map<string, number>();
  for (const p of expired) {
    byMissionDay.set(p.missionDayId, (byMissionDay.get(p.missionDayId) ?? 0) + 1);
  }

  const ids = expired.map((p) => p.id);

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.participation.updateMany({
      where: { id: { in: ids }, status: "IN_PROGRESS", expiresAt: { lt: now } },
      data: { status: "EXPIRED", failureReason: "Expired" }
    });

    let restored = 0;
    for (const [missionDayId, count] of byMissionDay.entries()) {
      const u = await tx.missionDay.updateMany({
        where: { id: missionDayId },
        data: { quotaRemaining: { increment: count } }
      });
      if (u.count === 1) restored += count;
    }

    await tx.auditLog.create({
      data: {
        actorUserId: null,
        action: "CRON_EXPIRE_PARTICIPATIONS",
        targetType: "Participation",
        payloadJson: { expired: updated.count, restored }
      }
    });

    return { expired: updated.count, restored };
  });

  return NextResponse.json({ ok: true, ...result });
}


