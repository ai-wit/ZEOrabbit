import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";

const BodySchema = z.object({
  email: z.string().email().max(255)
});

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.redirect(new URL("/", req.url), 303);
  }

  const form = await req.formData();
  const parsed = BodySchema.safeParse({
    email: form.get("email")
  });
  if (!parsed.success) {
    return NextResponse.redirect(new URL("/dev/promote-admin", req.url), 303);
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findFirst({
    where: { email },
    select: { id: true }
  });
  if (!user) {
    return NextResponse.redirect(new URL("/dev/promote-admin", req.url), 303);
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { role: "ADMIN" }
    });
    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "DEV_PROMOTE_ADMIN",
        targetType: "User",
        targetId: user.id
      }
    });
  });

  return NextResponse.redirect(new URL("/admin", req.url), 303);
}


