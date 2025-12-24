import Link from "next/link";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getMemberProfileIdByUserId } from "@/server/rewarder/rewarder-profile";
import { getRewarderAvailableBalanceKrw, getRewarderBalanceKrw } from "@/server/rewarder/balance";
import { getPayoutPolicy } from "@/server/policy/get-policy";
import { PageHeader, PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Card, CardBody, DividerList, EmptyState, Input, Label, Pill } from "@/app/_ui/primitives";

export default async function RewarderPayoutsPage() {
  const user = await requireRole("MEMBER");
  const rewarderId = await getMemberProfileIdByUserId(user.id);

  const balance = await getRewarderBalanceKrw(rewarderId);
  const available = await getRewarderAvailableBalanceKrw(rewarderId);
  const payoutPolicy = await getPayoutPolicy();
  const minPayoutKrw = payoutPolicy?.minPayoutKrw ?? 1000;
  const account = await prisma.payoutAccount.findFirst({
    where: { rewarderId, isPrimary: true },
    select: { id: true, bankName: true, accountNumberMasked: true, accountHolderName: true }
  });

  const requests = await prisma.payoutRequest.findMany({
    where: { rewarderId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, amountKrw: true, status: true, createdAt: true, failureReason: true }
  });

  return (
    <PageShell
      header={
        <PageHeader
          eyebrow="REWARDER"
          title="출금/정산"
          description={`현재 잔액: ${balance}원 · 출금 가능액: ${available}원`}
          right={
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/rewarder" variant="secondary" size="sm">
                리워더 홈
              </ButtonLink>
              <ButtonLink href="/member/reward/missions" variant="secondary" size="sm">
                오늘의 미션
              </ButtonLink>
              <ButtonLink href="/member/reward/participations" variant="secondary" size="sm">
                내 참여 내역
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
      <Card>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-zinc-50">출금 계좌</div>
              {account ? (
                <div className="text-sm text-zinc-300">
                  {account.bankName} · {account.accountNumberMasked}
                  {account.accountHolderName ? ` · ${account.accountHolderName}` : ""}
                </div>
              ) : (
                <div className="text-sm text-zinc-400">등록된 계좌가 없습니다.</div>
              )}
            </div>
            <ButtonLink href="/member/reward/payouts/account" variant="secondary" size="sm">
              계좌 등록/변경
            </ButtonLink>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <div className="text-sm font-semibold text-zinc-50">출금 신청</div>
          <form action="/api/member/payouts" method="post" className="space-y-4">
            <input type="hidden" name="payoutAccountId" value={account?.id ?? ""} />
            <div className="space-y-2">
              <Label htmlFor="amountKrw">금액(원)</Label>
              <Input
                id="amountKrw"
                name="amountKrw"
                type="number"
                min={minPayoutKrw}
                step={100}
                required
                placeholder={`최소 ${minPayoutKrw}원`}
              />
            </div>
            <Button type="submit" variant="primary" disabled={!account} className="w-full">
              출금 신청
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <div className="border-b border-white/10 px-6 py-4 text-sm text-zinc-300">최근 신청 {requests.length}건</div>
        <DividerList>
          {requests.length === 0 ? (
            <EmptyState title="신청 내역이 없습니다." />
          ) : (
            requests.map((r) => (
              <div key={r.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-zinc-50">{r.amountKrw}원</div>
                      <Pill tone={r.status === "PAID" ? "emerald" : r.status === "REJECTED" ? "red" : "cyan"}>
                        {r.status}
                      </Pill>
                    </div>
                    <div className="text-xs text-zinc-400">
                      {r.failureReason ? `사유: ${r.failureReason}` : null}
                    </div>
                  </div>
                  <div className="text-xs text-zinc-500">{new Date(r.createdAt).toLocaleString("ko-KR")}</div>
                </div>
              </div>
            ))
          )}
        </DividerList>
      </Card>
    </PageShell>
  );
}


