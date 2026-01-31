import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { createPasswordResetToken } from "@/server/auth/password-reset";

const requestSchema = z.object({
  email: z.string().email()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "이메일을 확인해주세요." }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findFirst({
      where: { email },
      select: { id: true, email: true }
    });

    if (!user) {
      return NextResponse.json({ ok: true });
    }

    const { token, tokenHash, expiresAt } = createPasswordResetToken();
    await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.deleteMany({ where: { userId: user.id } });
      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt
        }
      });
    });

    const baseUrl = new URL(request.url).origin;
    const resetLink = `${baseUrl}/reset-password/confirm?token=${encodeURIComponent(token)}`;

    if (user.email) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          channel: "EMAIL",
          type: "PASSWORD_RESET",
          payloadJson: {
            email: user.email,
            resetLink,
            expiresAt
          }
        }
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/auth/password-reset/request error:", error);
    return NextResponse.json({ error: "비밀번호 재설정 요청에 실패했습니다." }, { status: 500 });
  }
}

