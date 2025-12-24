import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { verifyPassword } from "@/server/auth/password";
import { createSessionForUser } from "@/server/auth/session";
import { getClientIp } from "@/server/security/ip";
import { isIpBlocked } from "@/server/security/blacklist";

const LoginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(100)
});

export async function POST(req: Request) {
  if (await isIpBlocked(getClientIp(req.headers))) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  const form = await req.formData();
  const parsed = LoginSchema.safeParse({
    email: form.get("email"),
    password: form.get("password")
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findFirst({
    where: { email },
    select: {
      id: true,
      role: true,
      status: true,
      credential: { select: { passwordHash: true } }
    }
  });

  if (!user || user.status !== "ACTIVE" || !user.credential) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  const ok = await verifyPassword(parsed.data.password, user.credential.passwordHash);
  if (!ok) return NextResponse.redirect(new URL("/login", req.url), 303);

  await createSessionForUser({ userId: user.id, ttlDays: 30 });

  const redirectTo =
    user.role === "ADVERTISER"
      ? "/advertiser"
      : user.role === "MEMBER"
        ? "/member"
        : "/admin";

  return NextResponse.redirect(new URL(redirectTo, req.url), 303);
}


