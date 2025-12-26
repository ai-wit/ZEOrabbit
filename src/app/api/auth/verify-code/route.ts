import { NextResponse } from "next/server";
import { z } from "zod";
import { verificationStore } from "@/server/verification-store";

const VerifyCodeSchema = z.object({
  phone: z.string().min(10).max(20),
  code: z.string().length(6)
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = VerifyCodeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "유효하지 않은 요청입니다." },
        { status: 400 }
      );
    }

    const { phone, code } = parsed.data;

    // Normalize phone number (remove hyphens and spaces)
    const normalizedPhone = phone.replace(/[-\s]/g, '');

    console.log(`🔍 Verifying code for phone: "${phone}" -> normalized: "${normalizedPhone}", code: "${code}"`);

    // Get stored verification data
    const stored = await verificationStore.get(normalizedPhone);

    console.log(`🔍 Checking verification for ${normalizedPhone}, found:`, !!stored);
    await verificationStore.debug();

    if (!stored) {
      return NextResponse.json(
        { error: "인증번호를 먼저 요청해주세요." },
        { status: 400 }
      );
    }

    // Check if code matches
    if (stored.code !== code) {
      const canRetry = await verificationStore.incrementAttempts(normalizedPhone);
      if (!canRetry) {
        return NextResponse.json(
          { error: "인증번호 확인 시도가 초과되었습니다. 다시 요청해주세요." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "인증번호가 일치하지 않습니다." },
        { status: 400 }
      );
    }

    // Verification successful - clean up the code
    await verificationStore.delete(normalizedPhone);

    return NextResponse.json({
      success: true,
      message: "인증이 완료되었습니다."
    });

  } catch (error) {
    console.error("Verify code error:", error);
    return NextResponse.json(
      { error: "인증 확인에 실패했습니다." },
      { status: 500 }
    );
  }
}
