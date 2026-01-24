import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { getBaseUrl } from "@/server/url-helpers";

const BodySchema = z.object({
  email: z.string().email().max(255)
});

export async function POST(req: Request) {
  const baseUrl = getBaseUrl(req);
  
  if (process.env.NODE_ENV === "production") {
    return NextResponse.redirect(new URL("/", baseUrl), 303);
  }

  const form = await req.formData();
  const parsed = BodySchema.safeParse({
    email: form.get("email")
  });
  if (!parsed.success) {
    return NextResponse.redirect(new URL("/dev/promote-admin", baseUrl), 303);
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findFirst({
    where: { email },
    select: { id: true }
  });
  if (!user) {
    return NextResponse.redirect(new URL("/dev/promote-admin", baseUrl), 303);
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

  return NextResponse.redirect(new URL("/admin", baseUrl), 303);
}


