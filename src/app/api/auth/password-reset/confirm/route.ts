import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { hashPassword } from "@/server/auth/password";
import { hashPasswordResetToken } from "@/server/auth/password-reset";

const confirmSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(100)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = confirmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "입력값을 확인해주세요." }, { status: 400 });
    }

    const tokenHash = hashPasswordResetToken(parsed.data.token);
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      select: { id: true, userId: true }
    });

    if (!resetToken) {
      return NextResponse.json({ error: "유효하지 않거나 만료된 링크입니다." }, { status: 400 });
    }

    const passwordHash = await hashPassword(parsed.data.password);
    await prisma.$transaction(async (tx) => {
      await tx.authCredential.upsert({
        where: { userId: resetToken.userId },
        update: { passwordHash },
        create: { userId: resetToken.userId, passwordHash }
      });
      await tx.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() }
      });
      await tx.session.deleteMany({
        where: { userId: resetToken.userId }
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/auth/password-reset/confirm error:", error);
    return NextResponse.json({ error: "비밀번호 재설정에 실패했습니다." }, { status: 500 });
  }
}

