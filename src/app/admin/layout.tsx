import { requireRole } from "@/server/auth/require-user";
import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/prisma";
import { redirect } from "next/navigation";
import { AdminProvider } from "./AdminProvider";

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

  // 현재 사용자 정보와 담당 광고주 목록 조회
  const user = await getCurrentUser();
  let managedAdvertisers: any[] = [];

  if (user?.adminType === "MANAGER") {
    managedAdvertisers = await prisma.advertiserManager.findMany({
      where: {
        managerId: user.id,
        isActive: true
      },
      include: {
        advertiser: {
          include: {
            user: { select: { name: true } }
          }
        }
      }
    });
  }

  const adminData = {
    user,
    managedAdvertisers: managedAdvertisers.map(am => am.advertiser)
  };

  return (
    <AdminProvider adminData={adminData}>
      {children}
    </AdminProvider>
  );
}
