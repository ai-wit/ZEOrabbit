import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { hashPassword } from "@/server/auth/password";
import { createSessionForUser } from "@/server/auth/session";
import { getClientIp } from "@/server/security/ip";
import { isIpBlocked } from "@/server/security/blacklist";
import { getBaseUrl } from "@/server/url-helpers";

const SignupSchema = z.object({
  role: z.enum(["ADVERTISER", "MEMBER"]),
  email: z.string().email().max(255),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(100),
  phone: z.string().min(10).max(20),
  businessNumber: z.union([z.string().max(20), z.undefined()]),
  agreeService: z.literal("yes"),
  agreePrivacy: z.literal("yes"),
  agreeRewarderGuide: z.union([z.literal("yes"), z.undefined()])
});

export async function POST(req: Request) {
  const baseUrl = getBaseUrl(req);
  
  if (await isIpBlocked(getClientIp(req.headers))) {
    return NextResponse.redirect(new URL("/signup", baseUrl), 303);
  }

  const form = await req.formData();
  const parsed = SignupSchema.safeParse({
    role: form.get("role"),
    email: form.get("email"),
    password: form.get("password"),
    name: form.get("name"),
    phone: form.get("phone"),
    businessNumber: form.get("businessNumber") ?? undefined,
    agreeService: form.get("agreeService"),
    agreePrivacy: form.get("agreePrivacy"),
    agreeRewarderGuide: form.get("agreeRewarderGuide") ?? undefined
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL("/signup", baseUrl), 303);
  }

  const data = parsed.data;
  if (data.role === "MEMBER" && data.agreeRewarderGuide !== "yes") {
    return NextResponse.redirect(new URL("/signup", baseUrl), 303);
  }

  const email = data.email.toLowerCase();
  const passwordHash = await hashPassword(data.password);

  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          role: data.role,
          email,
          name: data.name,
          phone: data.phone
        },
        select: { id: true, role: true }
      });

      await tx.authCredential.create({
        data: {
          userId: created.id,
          passwordHash
        }
      });

      if (created.role === "ADVERTISER") {
        await tx.advertiserProfile.create({
          data: {
            userId: created.id,
            businessNumber: data.businessNumber
          }
        });
      } else {
        await tx.memberProfile.create({
          data: { userId: created.id }
        });
      }

      const version = "v1";
      await tx.termsAgreement.createMany({
        data: [
          { userId: created.id, type: "SERVICE", version },
          { userId: created.id, type: "PRIVACY", version },
          ...(created.role === "MEMBER"
            ? [{ userId: created.id, type: "REWARDER_GUIDE", version } as const]
            : [])
        ]
      });

      await tx.auditLog.create({
        data: {
          actorUserId: created.id,
          action: "USER_SIGNUP",
          targetType: "User",
          targetId: created.id
        }
      });

      return created;
    });

    await createSessionForUser({ userId: user.id, ttlDays: 30 });

    const redirectTo =
      user.role === "ADVERTISER"
        ? "/advertiser"
        : user.role === "MEMBER"
          ? "/member"
          : "/";

    return NextResponse.redirect(new URL(redirectTo, baseUrl), 303);
  } catch {
    return NextResponse.redirect(new URL("/signup", baseUrl), 303);
  }
}


