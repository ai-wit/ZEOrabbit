import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/prisma";
import { getUploadDirForReading } from "@/server/upload/storage";

function guessContentType(ext: string): string {
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".webm") return "video/webm";
  return "application/octet-stream";
}

async function canReadRewardParticipationFile(params: {
  userId: string;
  userRole: "ADMIN" | "ADVERTISER" | "MEMBER";
  adminType?: "SUPER" | "MANAGER" | null;
  participationId: string;
}): Promise<boolean> {
  if (params.userRole === "ADVERTISER") return false;

  if (params.userRole === "MEMBER") {
    const p = await prisma.participation.findUnique({
      where: { id: params.participationId },
      select: { rewarder: { select: { userId: true } } }
    });
    return p?.rewarder.userId === params.userId;
  }

  // ADMIN
  if (params.adminType === "SUPER") return true;
  if (params.adminType !== "MANAGER") return false;

  const p = await prisma.participation.findUnique({
    where: { id: params.participationId },
    select: {
      missionDay: { select: { campaign: { select: { advertiserId: true } } } }
    }
  });
  if (!p) return false;

  const rel = await prisma.advertiserManager.findFirst({
    where: { managerId: params.userId, advertiserId: p.missionDay.campaign.advertiserId, isActive: true },
    select: { id: true }
  });
  return !!rel;
}

export async function GET(req: Request, ctx: { params: { path: string[] } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const segments = ctx.params.path ?? [];
  // Expected: reward/participations/{participationId}/{file}
  if (segments.length < 4 || segments[0] !== "reward" || segments[1] !== "participations") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const participationId = segments[2]!;
  const ok = await canReadRewardParticipationFile({
    userId: user.id,
    userRole: user.role,
    adminType: user.adminType ?? null,
    participationId
  });
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const uploadDirAbs = getUploadDirForReading();
  const relPath = segments.join("/");
  const absPath = path.resolve(uploadDirAbs, relPath);
  const rel = path.relative(uploadDirAbs, absPath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const buf = await fs.readFile(absPath);
    const ext = path.extname(absPath).toLowerCase();
    const contentType = guessContentType(ext);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600"
      }
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}


