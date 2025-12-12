import { prisma } from "@/server/prisma";

export async function getRewarderProfileIdByUserId(userId: string): Promise<string> {
  const profile = await prisma.rewarderProfile.findUnique({
    where: { userId },
    select: { id: true }
  });
  if (!profile) throw new Error("Rewarder profile not found");
  return profile.id;
}


