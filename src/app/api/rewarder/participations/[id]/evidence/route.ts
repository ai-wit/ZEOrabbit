import { NextResponse } from "next/server";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getMemberProfileIdByUserId } from "@/server/rewarder/rewarder-profile";
import { isJpeg, isPng, isWebp } from "@/server/upload/magic";
import { getClientIp } from "@/server/security/ip";
import { isIpBlocked } from "@/server/security/blacklist";

function toBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64");
}

export async function POST(
  req: Request,
  ctx: { params: { id: string } }
) {
  if (await isIpBlocked(getClientIp(req.headers))) {
    return NextResponse.redirect(new URL("/rewarder/participations", req.url), 303);
  }

  const user = await requireRole("MEMBER");
  const rewarderId = await getMemberProfileIdByUserId(user.id);
  const participationId = ctx.params.id;

  const participation = await prisma.participation.findFirst({
    where: { id: participationId, rewarderId },
    select: { id: true, status: true, expiresAt: true }
  });
  if (!participation) {
    return NextResponse.redirect(new URL("/rewarder/participations", req.url), 303);
  }

  if (participation.status !== "IN_PROGRESS") {
    return NextResponse.redirect(new URL(`/rewarder/participations/${participation.id}`, req.url), 303);
  }

  if (Date.now() > new Date(participation.expiresAt).getTime()) {
    await prisma.participation.update({
      where: { id: participation.id },
      data: { status: "EXPIRED", failureReason: "Expired before submission" }
    });
    return NextResponse.redirect(new URL(`/rewarder/participations/${participation.id}`, req.url), 303);
  }

  const form = await req.formData();
  const file = form.get("screenshot");
  if (!(file instanceof File)) {
    return NextResponse.redirect(new URL(`/rewarder/participations/${participation.id}`, req.url), 303);
  }

  // Hard limit to keep DB safe in MVP (1MB).
  const maxBytes = 1_000_000;
  if (file.size <= 0 || file.size > maxBytes) {
    return NextResponse.redirect(new URL(`/rewarder/participations/${participation.id}`, req.url), 303);
  }

  const mime = file.type || "application/octet-stream";
  const allowed = new Set(["image/png", "image/jpeg", "image/webp"]);
  if (!allowed.has(mime)) {
    return NextResponse.redirect(new URL(`/rewarder/participations/${participation.id}`, req.url), 303);
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const okMagic =
    (mime === "image/png" && isPng(bytes)) ||
    (mime === "image/jpeg" && isJpeg(bytes)) ||
    (mime === "image/webp" && isWebp(bytes));
  if (!okMagic) {
    return NextResponse.redirect(new URL(`/rewarder/participations/${participation.id}`, req.url), 303);
  }

  const base64 = toBase64(buffer);
  const dataUrl = `data:${mime};base64,${base64}`;

  await prisma.$transaction(async (tx) => {
    await tx.verificationEvidence.create({
      data: {
        participationId: participation.id,
        type: "SCREENSHOT",
        fileRef: dataUrl,
        metadataJson: {
          originalName: file.name,
          size: file.size,
          mime
        }
      }
    });

    await tx.participation.update({
      where: { id: participation.id },
      data: { status: "PENDING_REVIEW", submittedAt: new Date() }
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

  return NextResponse.redirect(new URL(`/rewarder/participations/${participation.id}`, req.url), 303);
}


