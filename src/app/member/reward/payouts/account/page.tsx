import Link from "next/link";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getMemberProfileIdByUserId } from "@/server/member/member-profile";
import { PageHeader, PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Card, CardBody, Input, Label } from "@/app/_ui/primitives";

export default async function RewarderPayoutAccountPage() {
  const user = await requireRole("MEMBER");
  const rewarderId = await getMemberProfileIdByUserId(user.id);

  const account = await prisma.payoutAccount.findFirst({
    where: { rewarderId, isPrimary: true },
    select: { id: true, bankName: true, accountNumberMasked: true, accountHolderName: true }
  });

  return (
    <PageShell
      header={
        <PageHeader
          eyebrow="REWARDER"
          title="출금 계좌"
          description="현재 Primary 계좌를 관리합니다."
          right={
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/member/reward/missions" variant="secondary" size="sm">
                오늘의 미션
              </ButtonLink>
              <ButtonLink href="/member/reward/participations" variant="secondary" size="sm">
                내 참여 내역
              </ButtonLink>
              <ButtonLink href="/member/reward/payouts" variant="secondary" size="sm">
                출금/정산
              </ButtonLink>
              <ButtonLink href="/member" variant="secondary" size="sm">
                리워더 홈
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
        <CardBody className="space-y-2">
          <div className="text-sm font-semibold text-zinc-50">현재 계좌</div>
          {account ? (
            <div className="text-sm text-zinc-300">
              {account.bankName} · {account.accountNumberMasked}
              {account.accountHolderName ? ` · ${account.accountHolderName}` : ""}
            </div>
          ) : (
            <div className="text-sm text-zinc-400">등록된 계좌가 없습니다.</div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <form action="/api/member/payout-accounts" method="post" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bankName">은행명</Label>
              <Input id="bankName" name="bankName" required maxLength={100} placeholder="예: 국민은행" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountNumber">계좌번호</Label>
              <Input id="accountNumber" name="accountNumber" required maxLength={64} placeholder="숫자/하이픈 포함 가능" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountHolderName">예금주명(선택)</Label>
              <Input id="accountHolderName" name="accountHolderName" maxLength={100} placeholder="예: 홍길동" />
            </div>

            <Button type="submit" variant="primary" className="w-full">
              Primary 계좌로 저장
            </Button>
          </form>
        </CardBody>
      </Card>
    </PageShell>
  );
}


