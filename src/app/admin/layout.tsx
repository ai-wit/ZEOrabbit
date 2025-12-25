import { requireRole } from "@/server/auth/require-user";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 관리자 권한 확인
  try {
    await requireRole("ADMIN");
  } catch {
    redirect("/login");
  }

  return <>{children}</>;
}
