import { prisma } from "@/server/prisma";
import { getUserIdFromSessionCookie } from "@/server/auth/session";

export type CurrentUser = {
  id: string;
  role: "ADVERTISER" | "REWARDER" | "ADMIN";
  email: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const userId = await getUserIdFromSessionCookie();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, email: true, status: true }
  });

  if (!user) return null;
  if (user.status !== "ACTIVE") return null;

  return {
    id: user.id,
    role: user.role,
    email: user.email ?? null
  };
}


