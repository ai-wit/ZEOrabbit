import Link from "next/link";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Card, CardBody, Input, Label, Pill, Select } from "@/app/_ui/primitives";
import { AdminHeader } from "../../_components/AdminHeader";

export default async function AdminProductDetailPage({ params }: { params: { id: string } }) {
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
        <div className="flex flex-wrap items-center justify-between gap-3">
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
          <Link href="/admin/products" className="text-sm text-zinc-300 hover:underline underline-offset-4">
            목록
          </Link>
        </div>

        <Card>
          <CardBody className="space-y-6">
            <form action={`/api/admin/products/${product.id}`} method="post" className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">상품명</Label>
                <Input id="name" name="name" required maxLength={100} defaultValue={product.name} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>상품 구분</Label>
                  <Select disabled defaultValue={product.missionType}>
                    <option value={product.missionType}>{product.missionType}</option>
                  </Select>
                  <div className="text-xs text-zinc-500">상품 구분(미션 유형)은 생성 후 변경을 막습니다.</div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitPriceKrw">단가(원)</Label>
                  <Input id="unitPriceKrw" name="unitPriceKrw" type="number" min={1} step={1} defaultValue={product.unitPriceKrw} required />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="vatPercent">VAT(%)</Label>
                  <Input id="vatPercent" name="vatPercent" type="number" min={0} max={100} step={1} defaultValue={product.vatPercent} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minOrderDays">최소 주문 기간(일)</Label>
                  <Input id="minOrderDays" name="minOrderDays" type="number" min={1} max={365} step={1} defaultValue={product.minOrderDays} required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="marketingCopy">상품 설명 문구</Label>
                <textarea
                  id="marketingCopy"
                  name="marketingCopy"
                  rows={4}
                  defaultValue={product.marketingCopy ?? ""}
                  className="w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="guideText">상세 가이드</Label>
                <textarea
                  id="guideText"
                  name="guideText"
                  rows={8}
                  defaultValue={product.guideText ?? ""}
                  className="w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/10"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="isActive"
                  name="isActive"
                  type="checkbox"
                  className="h-4 w-4"
                  defaultChecked={product.isActive}
                />
                <Label htmlFor="isActive">판매/노출 활성화</Label>
              </div>

              <Button type="submit" variant="primary" className="w-full">
                저장
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </PageShell>
  );
}

