import { prisma } from "@/server/prisma";

export async function getMemberProfileIdByUserId(userId: string): Promise<string> {
  const profile = await prisma.memberProfile.findUnique({
    where: { userId },
    select: { id: true }
  });
  if (!profile) throw new Error("Member profile not found");
  return profile.id;
}
