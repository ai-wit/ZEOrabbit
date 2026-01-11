import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { isJpeg, isPng, isWebp } from "@/server/upload/magic";

export type StoredUpload = {
  fileRef: string; // URL path served by our app (e.g. /api/uploads/...)
  relPath: string; // relative to UPLOAD_DIR
  mime: string;
  size: number;
  originalName: string;
};

function getUploadMaxBytes(): number {
  const raw = process.env.UPLOAD_MAX_BYTES;
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  return 10 * 1024 * 1024; // 10MB default
}

function getUploadDirAbs(): string {
  const dir = process.env.UPLOAD_DIR?.trim();
  if (dir) return path.resolve(dir);
  return path.resolve(process.cwd(), "uploads");
}

function safeExtFromMime(mime: string): string | null {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  if (mime === "video/mp4") return "mp4";
  if (mime === "video/webm") return "webm";
  return null;
}

function assertUnderRoot(absRoot: string, absPath: string): void {
  const rel = path.relative(absRoot, absPath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("Invalid path");
  }
}

export async function storeRewardEvidenceFile(params: {
  participationId: string;
  file: File;
}): Promise<StoredUpload> {
  const maxBytes = getUploadMaxBytes();
  const f = params.file;

  if (!(f instanceof File)) {
    throw new Error("Invalid file");
  }
  if (f.size <= 0 || f.size > maxBytes) {
    throw new Error("File too large");
  }

  const mime = f.type || "application/octet-stream";
  const ext = safeExtFromMime(mime);
  if (!ext) {
    throw new Error("Unsupported file type");
  }

  const buffer = await f.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Basic magic validation for images; videos are validated by mime/ext only for now.
  if (mime.startsWith("image/")) {
    const okMagic =
      (mime === "image/png" && isPng(bytes)) ||
      (mime === "image/jpeg" && isJpeg(bytes)) ||
      (mime === "image/webp" && isWebp(bytes));
    if (!okMagic) {
      throw new Error("Invalid image file");
    }
  }

  const uploadDirAbs = getUploadDirAbs();
  const relPath = path.posix.join(
    "reward",
    "participations",
    params.participationId,
    `${crypto.randomUUID()}.${ext}`
  );

  const absPath = path.resolve(uploadDirAbs, relPath);
  assertUnderRoot(uploadDirAbs, absPath);
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, Buffer.from(buffer));

  return {
    fileRef: `/api/uploads/${relPath}`,
    relPath,
    mime,
    size: f.size,
    originalName: f.name
  };
}

export function getUploadDirForReading(): string {
  return getUploadDirAbs();
}


