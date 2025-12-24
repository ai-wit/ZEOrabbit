import { redirect } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "@/server/auth/current-user";

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(
  role: CurrentUser["role"]
): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== role) redirect("/");
  return user;
}

// requireMemberRole 헬퍼 함수 추가 (선택사항)
export async function requireMemberRole(): Promise<CurrentUser & { role: "MEMBER" }> {
  const user = await requireRole("MEMBER");
  return user;
}


