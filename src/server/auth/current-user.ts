import { prisma } from "@/server/prisma";
import { getUserIdFromSessionCookie } from "@/server/auth/session";

export type CurrentUser = {
  id: string;
  role: "ADVERTISER" | "MEMBER" | "ADMIN";
  email: string | null;
  name: string | null;
  memberType?: "NORMAL" | "TEAM_LEADER" | "TEAM_PRO_LEADER";
  adminType?: "SUPER" | "MANAGER";
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const userId = await getUserIdFromSessionCookie();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, email: true, name: true, status: true, memberType: true, adminType: true }
  });

  if (!user) return null;
  if (user.status !== "ACTIVE") return null;

  return {
    id: user.id,
    role: user.role,
    email: user.email ?? null,
    name: user.name ?? null,
    memberType: user.memberType ?? undefined,
    adminType: user.adminType ?? undefined
  };
}


