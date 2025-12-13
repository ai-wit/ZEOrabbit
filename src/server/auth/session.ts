import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/server/prisma";

const SESSION_COOKIE_NAME = "zeo_session";

function sha256Base64Url(input: string): string {
  return crypto.createHash("sha256").update(input).digest("base64url");
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}

export async function createSessionForUser(params: {
  userId: string;
  ttlDays: number;
}): Promise<void> {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = sha256Base64Url(token);
  const expiresAt = new Date(Date.now() + params.ttlDays * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId: params.userId,
      tokenHash,
      expiresAt
    }
  });

  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt
  });
}

export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const tokenHash = sha256Base64Url(token);
    await prisma.session.deleteMany({
      where: { tokenHash }
    });
  }

  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0)
  });
}

export async function getUserIdFromSessionCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenHash = sha256Base64Url(token);
  const session = await prisma.session.findFirst({
    where: {
      tokenHash,
      expiresAt: { gt: new Date() }
    },
    select: { userId: true }
  });
  return session?.userId ?? null;
}


