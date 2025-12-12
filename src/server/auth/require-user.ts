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


