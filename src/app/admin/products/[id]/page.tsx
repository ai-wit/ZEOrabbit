import Link from "next/link";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Card, CardBody, Input, Label, Pill, Select } from "@/app/_ui/primitives";
import { AdminHeader } from "../../_components/AdminHeader";
import { ProductForm } from "./ProductForm";

export default async function AdminProductDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const user = await requireRole("ADMIN");

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      missionType: true,
      unitPriceKrw: true,
      vatPercent: true,
      minOrderDays: true,
      isActive: true,
      marketingCopy: true,
      guideText: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!product) {
    return (
      <PageShell
        header={
          <AdminHeader
            title="상품"
            description={`${user.email ?? user.id} (${user.role})`}
          />
        }
      >
        <Card>
          <CardBody className="space-y-4">
            <div className="text-sm text-zinc-300">상품을 찾을 수 없습니다.</div>
            <ButtonLink href="/admin/products" variant="secondary">
              목록으로
            </ButtonLink>
          </CardBody>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      header={
        <AdminHeader
          title="상품 상세"
          description={`${user.email ?? user.id} (${user.role})`}
        />
      }
    >
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="text-lg font-semibold text-zinc-50">{product.name}</div>
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={product.isActive ? "emerald" : "neutral"}>
              {product.isActive ? "ACTIVE" : "INACTIVE"}
            </Pill>
            <Pill tone="neutral">{product.missionType}</Pill>
            <div className="text-xs text-zinc-500">
              생성 {new Date(product.createdAt).toLocaleString("ko-KR")} · 수정{" "}
              {new Date(product.updatedAt).toLocaleString("ko-KR")}
            </div>
          </div>
        </div>

        <Card>
          <CardBody className="space-y-6">
            <ProductForm
              product={product}
              error={typeof searchParams.error === 'string' ? searchParams.error : undefined}
              saved={typeof searchParams.saved === 'string' ? searchParams.saved : undefined}
            />
          </CardBody>
        </Card>
      </div>
    </PageShell>
  );
}