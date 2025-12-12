import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getAdvertiserProfileIdByUserId } from "@/server/advertiser/advertiser-profile";

const CreatePlaceSchema = z.object({
  name: z.string().min(1).max(255),
  externalProvider: z.string().max(64).optional(),
  externalId: z.string().max(128).optional()
});

export async function POST(req: Request) {
  const user = await requireRole("ADVERTISER");
  const advertiserId = await getAdvertiserProfileIdByUserId(user.id);

  const form = await req.formData();
  const parsed = CreatePlaceSchema.safeParse({
    name: form.get("name"),
    externalProvider: form.get("externalProvider") || undefined,
    externalId: form.get("externalId") || undefined
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL("/advertiser/places/new", req.url), 303);
  }

  await prisma.place.create({
    data: {
      advertiserId,
      name: parsed.data.name,
      externalProvider: parsed.data.externalProvider ?? null,
      externalId: parsed.data.externalId ?? null
    }
  });

  return NextResponse.redirect(new URL("/advertiser/places", req.url), 303);
}


