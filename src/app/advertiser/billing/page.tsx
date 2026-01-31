import { requireRole } from "@/server/auth/require-user";
import { getAdvertiserProfileIdByUserId } from "@/server/advertiser/advertiser-profile";
import { getAdvertiserBudgetBalanceKrw } from "@/server/advertiser/balance";
import { prisma } from "@/server/prisma";
import { PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Card, CardBody, DividerList, EmptyState, Input, Label, Pill } from "@/app/_ui/primitives";
import { AdvertiserHeader } from "../_components/AdvertiserHeader";
import { getPaymentStatusLabel } from "@/lib/status-labels";

export default async function AdvertiserBillingPage() {
  const user = await requireRole("ADVERTISER");
  const advertiserId = await getAdvertiserProfileIdByUserId(user.id);

  const balance = await getAdvertiserBudgetBalanceKrw(advertiserId);
  const isDev = process.env.NODE_ENV === "development";
  const krNumber = new Intl.NumberFormat("ko-KR");
  const formatKrw = (value: number) => krNumber.format(value);

  const payments = await prisma.payment.findMany({
    where: { advertiserId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      amountKrw: true,
      status: true,
      provider: true,
      createdAt: true,
      productOrder: {
        select: {
          id: true,
          product: { select: { id: true, name: true } },
          place: { select: { name: true } },
        },
      },
    }
  });

  const ledgers = await prisma.budgetLedger.findMany({
    where: { advertiserId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, amountKrw: true, reason: true, refId: true, createdAt: true }
  });

  return (
    <PageShell
      header={
        <AdvertiserHeader
          title="결제/충전"
          description={`현재 포인트: ${formatKrw(balance)}P`}
        />
      }
    >
      <div className="space-y-8">
      <Card>
        <CardBody className="space-y-4">
          <div className="text-sm font-semibold text-zinc-50">충전</div>
          <form action="/api/advertiser/topups" method="post" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amountKrw">금액(원)</Label>
              <Input id="amountKrw" name="amountKrw" type="number" min={1000} step={1000} required placeholder="예: 50000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">결제 수단</Label>
              <select
                id="paymentMethod"
                name="paymentMethod"
                className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-zinc-50 focus:border-cyan-400/50 focus:outline-none"
                required
              >
                {isDev ? <option value="DEV">DEV 즉시 반영 (개발용)</option> : null}
                <option value="TOSS">토스페이먼츠 카드 결제</option>
              </select>
            </div>
            <Button type="submit" variant="primary" className="w-full">
              충전하기
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <div className="border-b border-white/10 px-6 py-4 text-sm text-zinc-300">최근 결제 {payments.length}건</div>
        <DividerList>
          {payments.length === 0 ? (
            <EmptyState title="결제 내역이 없습니다." />
          ) : (
            payments.map((p) => {
              const canRetry = p.status === "CREATED" && p.provider === "TOSS" && p.productOrder;
              const retryUrl = canRetry
                ? `/advertiser/billing/toss?${new URLSearchParams({
                    orderId: p.id,
                    amount: p.amountKrw.toString(),
                    orderName: `${p.productOrder.product.name} (${p.productOrder.place.name})`,
                    productId: p.productOrder.product.id,
                  }).toString()}`
                : null;

              return (
                <div key={p.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-zinc-50">{formatKrw(p.amountKrw)}원</div>
                        <Pill tone={p.status === "PAID" ? "emerald" : p.status === "FAILED" ? "red" : "neutral"}>
                          {getPaymentStatusLabel(p.status)}
                        </Pill>
                      </div>
                      <div className="text-xs text-zinc-400">{p.provider ?? "—"}</div>
                    </div>
                    <div className="text-right space-y-2">
                      <div className="text-xs text-zinc-500">{new Date(p.createdAt).toLocaleString("ko-KR")}</div>
                      {retryUrl ? (
                        <ButtonLink href={retryUrl} variant="secondary" size="sm">
                          결제 다시하기
                        </ButtonLink>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </DividerList>
      </Card>

      <Card>
        <div className="border-b border-white/10 px-6 py-4 text-sm text-zinc-300">최근 원장 {ledgers.length}건</div>
        <DividerList>
          {ledgers.length === 0 ? (
            <EmptyState title="원장 내역이 없습니다." />
          ) : (
            ledgers.map((l) => (
              <div key={l.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-zinc-50">
                      {l.amountKrw > 0 ? "+" : l.amountKrw < 0 ? "-" : ""}
                      {formatKrw(Math.abs(l.amountKrw))}원
                    </div>
                    <div className="text-xs text-zinc-400">
                      {l.reason} {l.refId ? `· ref=${l.refId}` : ""}
                    </div>
                  </div>
                  <div className="text-xs text-zinc-500">{new Date(l.createdAt).toLocaleString("ko-KR")}</div>
                </div>
              </div>
            ))
          )}
        </DividerList>
      </Card>
      </div>
    </PageShell>
  );
}


