import { requireRole } from "@/server/auth/require-user";
import { redirect } from "next/navigation";

export default async function AdvertiserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 광고주 권한 확인
  try {
    await requireRole("ADVERTISER");
  } catch {
    redirect("/login");
  }

  return <>{children}</>;
}
