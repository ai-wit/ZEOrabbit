import { NextResponse } from "next/server";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getMemberProfileIdByUserId } from "@/server/member/member-profile";
import { storeRewardEvidenceFile } from "@/server/upload/storage";
import { getClientIp } from "@/server/security/ip";
import { isIpBlocked } from "@/server/security/blacklist";
import { getBaseUrl } from "@/server/url-helpers";

export async function POST(
  req: Request,
  ctx: { params: { id: string } }
) {
  const baseUrl = getBaseUrl(req);

  if (await isIpBlocked(getClientIp(req.headers))) {
    return NextResponse.redirect(new URL("/member/reward/missions", baseUrl), 303);
  }

  const user = await requireRole("MEMBER");
  const rewarderId = await getMemberProfileIdByUserId(user.id);
  const participationId = ctx.params.id;

  const participation = await prisma.participation.findFirst({
    where: { id: participationId, rewarderId },
    select: { id: true, status: true, expiresAt: true, missionDayId: true }
  });
  if (!participation) {
    return NextResponse.redirect(new URL("/member/reward/participations", baseUrl), 303);
  }

  if (participation.status !== "IN_PROGRESS") {
    return NextResponse.redirect(new URL(`/member/reward/participations/${participation.id}`, baseUrl), 303);
  }

  if (Date.now() > new Date(participation.expiresAt).getTime()) {
    await prisma.$transaction(async (tx) => {
      await tx.participation.update({
        where: { id: participation.id },
        data: { status: "EXPIRED", failureReason: "제출 기한 초과로 참여가 취소되었습니다." }
      });

      // 만료된 참여의 슬롯 복원
      await tx.missionDay.updateMany({
        where: { id: participation.missionDayId },
        data: { quotaRemaining: { increment: 1 } }
      });
    });
    return NextResponse.redirect(new URL(`/member/reward/participations/${participation.id}`, baseUrl), 303);
  }

  const form = await req.formData();
  const proofText = String(form.get("proofText") ?? "").trim();
  const files = form.getAll("files").filter((item): item is File => item instanceof File);
  if (files.length === 0) {
    return NextResponse.redirect(new URL(`/member/reward/participations/${participation.id}`, baseUrl), 303);
  }
  if (proofText.length > 2000) {
    return NextResponse.redirect(new URL(`/member/reward/participations/${participation.id}`, baseUrl), 303);
  }
  if (files.length > 10) {
    return NextResponse.redirect(new URL(`/member/reward/participations/${participation.id}`, baseUrl), 303);
  }
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > 10 * 1024 * 1024) {
    return NextResponse.redirect(new URL(`/member/reward/participations/${participation.id}`, baseUrl), 303);
  }

  let storedFiles: Awaited<ReturnType<typeof storeRewardEvidenceFile>>[] = [];
  try {
    storedFiles = await Promise.all(
      files.map((file) => storeRewardEvidenceFile({ participationId: participation.id, file }))
    );
  } catch {
    return NextResponse.redirect(new URL(`/member/reward/participations/${participation.id}`, baseUrl), 303);
  }

  await prisma.$transaction(async (tx) => {
    for (const stored of storedFiles) {
      const evidenceType = stored.mime.startsWith("video/") ? "VIDEO" : "IMAGE";
      await tx.verificationEvidence.create({
        data: {
          participationId: participation.id,
          type: evidenceType,
          fileRef: stored.fileRef,
          metadataJson: {
            originalName: stored.originalName,
            size: stored.size,
            mime: stored.mime
          }
        }
      });
    }

    await tx.participation.update({
      where: { id: participation.id },
      data: { status: "PENDING_REVIEW", submittedAt: new Date(), proofText: proofText || null }
    });

    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "EVIDENCE_SUBMITTED",
        targetType: "Participation",
        targetId: participation.id
      }
    });
  });

  return NextResponse.redirect(new URL(`/member/reward/participations/${participation.id}`, baseUrl), 303);
}


