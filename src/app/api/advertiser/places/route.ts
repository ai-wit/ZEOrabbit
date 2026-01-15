import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getAdvertiserProfileIdByUserId } from "@/server/advertiser/advertiser-profile";

const NAVER_PLACE_URL_PREFIX = "https://m.place.naver.com/place/";
const NaverPlaceIdSchema = z
  .string()
  .regex(/^\d+$/, { message: "NAVER_PLACE id must be digits" })
  .max(32);

const CreatePlaceSchema = z.object({
  name: z.string().min(1).max(255),
  naverPlaceId: NaverPlaceIdSchema.optional(),
  url: z.string().max(2048).optional()
});

export async function POST(req: Request) {
  const user = await requireRole("ADVERTISER");
  const advertiserId = await getAdvertiserProfileIdByUserId(user.id);

  const form = await req.formData();
  const parsed = CreatePlaceSchema.safeParse({
    name: form.get("name"),
    naverPlaceId: form.get("naverPlaceId") || undefined,
    url: form.get("url") || undefined
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL("/advertiser/places/new", req.url), 303);
  }

  const normalizedIdFromUrl = (() => {
    if (!parsed.data.url) return undefined;
    const match = parsed.data.url.match(/^https:\/\/m\.place\.naver\.com\/place\/(\d+)\/?$/);
    return match?.[1];
  })();

  const naverPlaceId = parsed.data.naverPlaceId ?? normalizedIdFromUrl;
  if (!naverPlaceId) {
    return NextResponse.redirect(new URL("/advertiser/places/new", req.url), 303);
  }

  const naverPlaceIdValidated = NaverPlaceIdSchema.safeParse(naverPlaceId);
  if (!naverPlaceIdValidated.success) {
    return NextResponse.redirect(new URL("/advertiser/places/new", req.url), 303);
  }

  const fullUrl = `${NAVER_PLACE_URL_PREFIX}${naverPlaceIdValidated.data}`;

  await prisma.place.create({
    data: {
      advertiserId,
      name: parsed.data.name,
      url: fullUrl,
      externalProvider: "NAVER_PLACE",
      externalId: naverPlaceIdValidated.data
    }
  });

  return NextResponse.redirect(new URL("/advertiser/places", req.url), 303);
}


