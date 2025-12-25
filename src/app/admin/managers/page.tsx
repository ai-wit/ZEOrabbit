import { prisma } from "@/server/prisma";
import { PageShell } from "@/app/_ui/shell";
import {
  ButtonLink,
  Card,
  CardBody,
  DividerList,
  EmptyState,
  Pill
} from "@/app/_ui/primitives";
import { AdminHeader } from "../_components/AdminHeader";

function formatNumber(n: number): string {
  return new Intl.NumberFormat("ko-KR").format(n);
}

function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(d);
}

export default async function ManagersPage() {
  const managers = await prisma.user.findMany({
    where: {
      role: "ADMIN",
      adminType: "MANAGER"
    },
    include: {
      _count: {
        select: {
          managedAdvertisers: {
            where: { isActive: true }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  // 각 매니저의 광고주 목록도 포함
  const managersWithAdvertisers = await Promise.all(
    managers.map(async (manager) => {
      const assignments = await prisma.advertiserManager.findMany({
        where: {
          managerId: manager.id,
          isActive: true
        },
        include: {
          advertiser: {
            include: {
              user: {
                select: { name: true, email: true }
              }
            }
          }
        }
      });

      return {
        ...manager,
        advertisers: assignments.map(a => a.advertiser)
      };
    })
  );

  return (
    <PageShell
      header={
        <AdminHeader
          title="매니저 관리"
          description="매니저를 등록하고 관리하며, 각 매니저별 할당된 광고주를 확인할 수 있습니다."
        />
      }
    >
      <div className="space-y-6">
        {/* 등록 버튼 */}
        <div className="flex justify-end">
          <ButtonLink href="/admin/managers/new" variant="primary" size="sm">
            새 매니저 등록
          </ButtonLink>
        </div>

        {/* 매니저 목록 */}
        <Card>
          <CardBody className="space-y-4">
            <div className="text-sm font-semibold text-zinc-50">
              매니저 목록 ({formatNumber(managersWithAdvertisers.length)}명)
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
              <DividerList>
                {managersWithAdvertisers.length === 0 ? (
                  <EmptyState title="등록된 매니저가 없습니다." />
                ) : (
                  managersWithAdvertisers.map((manager) => (
                    <div key={manager.id} className="px-6 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-zinc-50">
                              {manager.name}
                            </div>
                            <Pill tone="indigo">
                              매니저
                            </Pill>
                          </div>
                          <div className="text-xs text-zinc-400">
                            {manager.email}
                          </div>
                          <div className="text-xs text-zinc-500">
                            할당 광고주: {formatNumber(manager._count.managedAdvertisers)}개
                          </div>
                          <div className="text-xs text-zinc-500">
                            등록: {formatDateTime(manager.createdAt)}
                          </div>
                          {manager.advertisers.length > 0 && (
                            <div className="text-xs text-zinc-400">
                              광고주: {manager.advertisers.map(a => a.user.name).join(", ")}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <ButtonLink href={`/admin/managers/${manager.id}`} variant="secondary" size="sm">
                            상세
                          </ButtonLink>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </DividerList>
            </div>
          </CardBody>
        </Card>
      </div>
    </PageShell>
  );
}