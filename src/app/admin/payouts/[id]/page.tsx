import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { PageHeader, PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Card, CardBody, Input, Pill } from "@/app/_ui/primitives";

export default async function AdminPayoutDetailPage(props: { params: { id: string } }) {
  await requireRole("ADMIN");

  const req = await prisma.payoutRequest.findUnique({
    where: { id: props.params.id },
    select: {
      id: true,
      amountKrw: true,
      status: true,
      createdAt: true,
      decidedAt: true,
      failureReason: true,
      rewarder: { select: { id: true, user: { select: { email: true } } } },
      payoutAccount: { select: { bankName: true, accountNumberMasked: true, accountHolderName: true } }
    }
  });
  if (!req) notFound();

  return (
    <PageShell
      header={
        <PageHeader
          eyebrow="ADMIN"
          title="출금 요청 상세"
          description="요청 정보를 확인하고 처리합니다."
          right={
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/admin/payouts" variant="secondary" size="sm">
                목록
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
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold text-zinc-50">금액: {req.amountKrw}원</div>
            <Pill tone={req.status === "REQUESTED" ? "cyan" : req.status === "APPROVED" ? "indigo" : "neutral"}>
              {req.status}
            </Pill>
          </div>
          <div className="text-xs text-zinc-400">리워더: {req.rewarder.user.email ?? req.rewarder.id}</div>
          <div className="text-xs text-zinc-400">
            계좌: {req.payoutAccount.bankName} · {req.payoutAccount.accountNumberMasked}
            {req.payoutAccount.accountHolderName ? ` · ${req.payoutAccount.accountHolderName}` : ""}
          </div>
          <div className="text-xs text-zinc-500">
            생성: {new Date(req.createdAt).toLocaleString("ko-KR")}
            {req.decidedAt ? ` · 결정: ${new Date(req.decidedAt).toLocaleString("ko-KR")}` : ""}
          </div>
          {req.failureReason ? <div className="text-xs text-red-200">사유: {req.failureReason}</div> : null}
        </CardBody>
      </Card>

      {req.status === "REQUESTED" || req.status === "APPROVED" ? (
        <Card>
          <CardBody className="space-y-4">
            <div className="text-sm font-semibold text-zinc-50">처리</div>
            <div className="flex flex-wrap items-center gap-3">
              {req.status === "REQUESTED" ? (
                <form action={`/api/admin/payouts/${req.id}/hold`} method="post">
                  <Button type="submit" variant="secondary">
                    보류(승인)
                  </Button>
                </form>
              ) : null}
              <form action={`/api/admin/payouts/${req.id}/approve`} method="post">
                <Button type="submit" variant="primary">
                  승인(지급 완료 처리)
                </Button>
              </form>
              <form action={`/api/admin/payouts/${req.id}/reject`} method="post" className="flex flex-wrap gap-2">
                <Input name="reason" placeholder="반려 사유" maxLength={200} required className="w-72" />
                <Button type="submit" variant="danger">
                  반려
                </Button>
              </form>
            </div>
          </CardBody>
        </Card>
      ) : null}
    </PageShell>
  );
}


