import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/prisma";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "관리자 권한이 필요합니다" },
        { status: 403 }
      );
    }

    if (!user.adminType || !["SUPER", "MANAGER"].includes(user.adminType)) {
      return NextResponse.json(
        { error: "관리자 권한이 필요합니다" },
        { status: 403 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("관리자 정보 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "관리자 권한이 필요합니다" },
        { status: 403 }
      );
    }

    if (!user.adminType || !["SUPER", "MANAGER"].includes(user.adminType)) {
      return NextResponse.json(
        { error: "관리자 권한이 필요합니다" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, currentPassword, newPassword } = body;

    // 이름 업데이트
    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json(
          { error: "이름을 입력해주세요" },
          { status: 400 }
        );
      }
    }

    // 비밀번호 변경 검증
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "현재 비밀번호를 입력해주세요" },
          { status: 400 }
        );
      }

      // 현재 비밀번호 확인
      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: "현재 비밀번호가 일치하지 않습니다" },
          { status: 400 }
        );
      }

      // 새 비밀번호 유효성 검사
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "새 비밀번호는 6자리 이상이어야 합니다" },
          { status: 400 }
        );
      }
    }

    // 데이터베이스 업데이트
    const updateData: any = {};
    if (name !== undefined) {
      updateData.name = name.trim();
    }
    if (newPassword) {
      updateData.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        adminType: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("관리자 정보 수정 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
