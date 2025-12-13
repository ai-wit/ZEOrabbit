import Link from "next/link";
import { requireRole } from "@/server/auth/require-user";
import { getAdvertiserProfileIdByUserId } from "@/server/advertiser/advertiser-profile";
import { getAdvertiserBudgetBalanceKrw } from "@/server/advertiser/balance";
import { prisma } from "@/server/prisma";
import { PageHeader, PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Card, CardBody, DividerList, EmptyState, Input, Label, Pill } from "@/app/_ui/primitives";

export default async function AdvertiserBillingPage() {
  const user = await requireRole("ADVERTISER");
  const advertiserId = await getAdvertiserProfileIdByUserId(user.id);

  const balance = await getAdvertiserBudgetBalanceKrw(advertiserId);

  const payments = await prisma.payment.findMany({
    where: { advertiserId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, amountKrw: true, status: true, provider: true, createdAt: true }
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
        <PageHeader
          eyebrow="ADVERTISER"
          title="결제/충전"
          description={`현재 예산 잔액: ${balance}원`}
          right={
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/advertiser/places" variant="secondary" size="sm">
                플레이스
              </ButtonLink>
              <ButtonLink href="/advertiser/campaigns" variant="secondary" size="sm">
                캠페인
              </ButtonLink>
              <ButtonLink href="/advertiser/reports" variant="secondary" size="sm">
                리포트
              </ButtonLink>
              <ButtonLink href="/advertiser" variant="secondary" size="sm">
                광고주 홈
              </ButtonLink>
              <ButtonLink href="/" variant="secondary" size="sm">
                홈
              </ButtonLink>
              <form action="/api/auth/logout" method="post">
                <Button type="submit" variant="danger" size="sm">
                  로그아웃
                </Button>
              </form>
            </div>
          }
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
            <Button type="submit" variant="primary" className="w-full">
              충전(DEV 즉시 반영)
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
            payments.map((p) => (
              <div key={p.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-zinc-50">{p.amountKrw}원</div>
                      <Pill tone={p.status === "PAID" ? "emerald" : p.status === "FAILED" ? "red" : "neutral"}>
                        {p.status}
                      </Pill>
                    </div>
                    <div className="text-xs text-zinc-400">{p.provider ?? "—"}</div>
                  </div>
                  <div className="text-xs text-zinc-500">{new Date(p.createdAt).toLocaleString("ko-KR")}</div>
                </div>
              </div>
            ))
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
                      {l.amountKrw > 0 ? "+" : ""}
                      {l.amountKrw}원
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


