import Link from "next/link";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { PageShell } from "@/app/_ui/shell";
import { ButtonLink, Card, DividerList, EmptyState, Pill } from "@/app/_ui/primitives";
import { AdminHeader } from "../_components/AdminHeader";

export default async function AdminProductsPage() {
  const user = await requireRole("ADMIN");

  const products = await prisma.product.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      missionType: true,
      unitPriceKrw: true,
      vatPercent: true,
      minOrderDays: true,
      isActive: true,
      createdAt: true,
    },
  });

  return (
    <PageShell
      header={
        <AdminHeader
          title="상품 마스터"
          description={`${user.email ?? user.id} (${user.role})`}
        />
      }
    >
      <div className="space-y-6">
        <div className="flex justify-end">
          <ButtonLink href="/admin/products/new" variant="primary" size="sm">
            상품 생성
          </ButtonLink>
        </div>

        <Card>
          <div className="border-b border-white/10 px-6 py-4 text-sm text-zinc-300">
            총 {products.length}개
          </div>
          <DividerList>
            {products.length === 0 ? (
              <EmptyState title="상품이 없습니다." />
            ) : (
              products.map((p) => (
                <Link
                  key={p.id}
                  href={`/admin/products/${p.id}`}
                  className="block px-6 py-4 hover:bg-white/[0.02]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-zinc-50">{p.name}</div>
                        <Pill tone={p.isActive ? "emerald" : "neutral"}>
                          {p.isActive ? "ACTIVE" : "INACTIVE"}
                        </Pill>
                        <Pill tone="neutral">{p.missionType}</Pill>
                      </div>
                      <div className="text-xs text-zinc-400">
                        단가 {p.unitPriceKrw}원 · VAT {p.vatPercent}% · 최소 {p.minOrderDays}일
                      </div>
                    </div>
                    <div className="text-xs text-zinc-500">
                      {new Date(p.createdAt).toLocaleString("ko-KR")}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </DividerList>
        </Card>
      </div>
    </PageShell>
  );
}

