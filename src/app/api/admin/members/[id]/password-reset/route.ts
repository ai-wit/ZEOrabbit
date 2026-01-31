import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { createPasswordResetToken } from "@/server/auth/password-reset";

const requestSchema = z.object({
  sendEmail: z.boolean().optional()
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole("ADMIN");
    if (user.adminType !== "SUPER") {
      return NextResponse.json({ error: "슈퍼 관리자 권한이 필요합니다." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
    }

    const member = await prisma.user.findFirst({
      where: { id: params.id, role: "MEMBER" },
      select: { id: true, email: true }
    });
    if (!member) {
      return NextResponse.json({ error: "회원 정보를 찾을 수 없습니다." }, { status: 404 });
    }

    if (parsed.data.sendEmail && !member.email) {
      return NextResponse.json({ error: "회원 이메일이 등록되어 있지 않습니다." }, { status: 400 });
    }

    const { token, tokenHash, expiresAt } = createPasswordResetToken();
    await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.deleteMany({
        where: { userId: member.id }
      });
      await tx.passwordResetToken.create({
        data: {
          userId: member.id,
          tokenHash,
          expiresAt
        }
      });
    });

    const baseUrl = new URL(request.url).origin;
    const resetLink = `${baseUrl}/reset-password/confirm?token=${encodeURIComponent(token)}`;

    if (parsed.data.sendEmail && member.email) {
      await prisma.notification.create({
        data: {
          userId: member.id,
          channel: "EMAIL",
          type: "PASSWORD_RESET",
          payloadJson: {
            email: member.email,
            resetLink,
            expiresAt
          }
        }
      });
    }

    return NextResponse.json({ resetLink, expiresAt });
  } catch (error) {
    console.error("POST /api/admin/members/[id]/password-reset error:", error);
    return NextResponse.json({ error: "비밀번호 재설정 링크를 생성할 수 없습니다." }, { status: 500 });
  }
}

