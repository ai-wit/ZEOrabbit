import { prisma } from "@/server/prisma";

export async function getAdvertiserProfileIdByUserId(userId: string): Promise<string> {
  const profile = await prisma.advertiserProfile.findUnique({
    where: { userId },
    select: { id: true }
  });
  if (!profile) throw new Error("Advertiser profile not found");
  return profile.id;
}


