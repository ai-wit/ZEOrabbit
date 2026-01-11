import { redirect } from "next/navigation";
import { requireRole } from "@/server/auth/require-user";

export async function requireManager() {
  const user = await requireRole("ADMIN");
  if (user.adminType !== "MANAGER") redirect("/");
  return user;
}


