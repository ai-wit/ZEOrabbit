import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

// GET: Fetch current profile
export async function GET() {
  try {
    const user = await requireRole("MEMBER");

    // Fetch user with phone from database
    const userWithPhone = await prisma.user.findUnique({
      where: { id: user.id },
      select: { phone: true },
    });

    const memberProfile = await prisma.memberProfile.findUnique({
      where: { userId: user.id },
      select: {
        age: true,
        gender: true,
      },
    });

    return NextResponse.json({
      id: user.id,
      name: user.name ?? "",
      email: user.email ?? "",
      phone: userWithPhone?.phone ?? "",
      age: memberProfile?.age ?? null,
      gender: memberProfile?.gender ?? null,
      role: user.role,
    });
  } catch (err) {
    console.error("GET /api/member/profile error:", err);
    return NextResponse.json({ message: "Failed to fetch profile" }, { status: 500 });
  }
}

// PUT: Update profile
const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.number().int().min(1).max(120).nullable().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).nullable().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
});

export async function PUT(req: NextRequest) {
  try {
    const user = await requireRole("MEMBER");
    const body = await req.json();

    // Validate input
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.errors }, { status: 400 });
    }

    const { name, age, gender, currentPassword, newPassword } = parsed.data;

    // Password change validation
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { message: "현재 비밀번호를 입력해주세요" },
          { status: 400 }
        );
      }

      // Verify current password
      const authCredential = await prisma.authCredential.findUnique({
        where: { userId: user.id },
        select: { passwordHash: true }
      });

      if (!authCredential) {
        return NextResponse.json(
          { message: "인증 정보를 찾을 수 없습니다" },
          { status: 404 }
        );
      }

      const isValidPassword = await bcrypt.compare(currentPassword, authCredential.passwordHash);
      if (!isValidPassword) {
        return NextResponse.json(
          { message: "현재 비밀번호가 일치하지 않습니다" },
          { status: 400 }
        );
      }

      // Validate new password length
      if (newPassword.length < 6) {
        return NextResponse.json(
          { message: "새 비밀번호는 6자리 이상이어야 합니다" },
          { status: 400 }
        );
      }
    }

    // Update User and MemberProfile in a transaction
    await prisma.$transaction(async (tx) => {
      // Prepare User update data
      const userUpdateData: any = { name };
      
      // Update User table (including password if provided)
      await tx.user.update({
        where: { id: user.id },
        data: userUpdateData,
      });

      // Update password in AuthCredential if provided
      if (newPassword) {
        const passwordHash = await bcrypt.hash(newPassword, 12);
        await tx.authCredential.update({
          where: { userId: user.id },
          data: { passwordHash }
        });
      }

      // Update MemberProfile table
      await tx.memberProfile.update({
        where: { userId: user.id },
        data: {
          age: age ?? null,
          gender: gender ?? null,
        },
      });
    });

    return NextResponse.json({ message: "Profile updated successfully" });
  } catch (err) {
    console.error("PUT /api/member/profile error:", err);
    return NextResponse.json({ message: "Failed to update profile" }, { status: 500 });
  }
}
