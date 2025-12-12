import { prisma } from "@/server/prisma";

export async function isIpBlocked(ip: string | null): Promise<boolean> {
  if (!ip) return false;
  const hit = await prisma.blacklist.findFirst({
    where: { type: "IP", value: ip, active: true },
    select: { id: true }
  });
  return Boolean(hit);
}


