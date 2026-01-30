import { NextResponse } from "next/server";
import { z } from "zod";
import { verificationStore } from "@/server/verification-store";
import { prisma } from "@/server/prisma";

const SendVerificationSchema = z.object({
  phone: z.string().min(10).max(20)
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = SendVerificationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "유효하지 않은 핸드폰 번호입니다." },
        { status: 400 }
      );
    }

    const { phone } = parsed.data;

    // Check if phone number is already registered
    const existingUser = await prisma.user.findFirst({
      where: { phone },
      select: { id: true }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "이미 가입되어 있는 전화번호입니다." },
        { status: 409 }
      );
    }

    // Normalize phone number (remove hyphens and spaces)
    const normalizedPhone = phone.replace(/[-\s]/g, '');

    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes

    // Store verification code
    await verificationStore.set(normalizedPhone, { code, expiresAt });

    console.log(`📱 Verification code for ${normalizedPhone}: ${code}`);
    // Debug: show current store state
    await verificationStore.debug();

    // In production, integrate with SMS service (e.g., Naver Cloud Platform, Kakao, etc.)
    // For now, just log the code for development
    console.log(`📱 Verification code for ${phone}: ${code}`);

    // TODO: Send SMS with actual SMS provider
    // Example:
    // await sendSMS(phone, `인증번호: ${code}. 5분 내에 입력해주세요.`);

    // In development-like mode, return the code for convenience
    const isDevelopmentMode =
      process.env.PHONE_VERIFICATION_MODE === "development" ||
      process.env.NODE_ENV === "development";

    return NextResponse.json({
      success: true,
      message: "인증번호가 발송되었습니다.",
      ...(isDevelopmentMode && { code }) // Only include code in development-like mode
    });

  } catch (error) {
    console.error("Send verification error:", error);
    return NextResponse.json(
      { error: "인증번호 발송에 실패했습니다." },
      { status: 500 }
    );
  }
}
