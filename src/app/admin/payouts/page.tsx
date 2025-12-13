import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { PageHeader, PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Card, DividerList, EmptyState, Input, Label, Pill, Select } from "@/app/_ui/primitives";
import { DateInput } from "@/app/_ui/DateInput";
import type { Prisma, PayoutStatus } from "@prisma/client";

function parseDateOnly(value: string | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d, 0, 0, 0, 0));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export default async function AdminPayoutsPage(props: {
  searchParams?: { status?: string; q?: string; from?: string; to?: string };
}) {
  await requireRole("ADMIN");

  const statusParam = props.searchParams?.status ?? "ALL";
  const q = (props.searchParams?.q ?? "").trim().toLowerCase();
  const from = parseDateOnly(props.searchParams?.from);
  const to = parseDateOnly(props.searchParams?.to);
  const toExclusive = to ? new Date(to.getTime() + 24 * 60 * 60 * 1000) : null;

  const allowed = ["REQUESTED", "APPROVED", "PAID", "REJECTED", "CANCELED"] as const;
  type AllowedStatus = (typeof allowed)[number];
  const statusFilter: AllowedStatus | null = allowed.includes(statusParam as AllowedStatus)
    ? (statusParam as AllowedStatus)
    : null;

  const defaultStatuses: PayoutStatus[] = ["REQUESTED", "APPROVED"];

  const where: Prisma.PayoutRequestWhereInput = {
    status: (statusFilter as PayoutStatus | null) ? (statusFilter as PayoutStatus) : { in: defaultStatuses },
    ...(q ? { rewarder: { user: { email: { contains: q } } } } : {}),
    ...(from || toExclusive
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(toExclusive ? { lt: toExclusive } : {})
          }
        }
      : {})
  };

  const items = await prisma.payoutRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      amountKrw: true,
      status: true,
      createdAt: true,
      failureReason: true,
      rewarder: { select: { id: true, user: { select: { email: true } } } },
      payoutAccount: { select: { bankName: true, accountNumberMasked: true, accountHolderName: true } }
    }
  });

  return (
    <PageShell
      header={
        <PageHeader
          eyebrow="ADMIN"
          title="출금 요청"
          description="상태/이메일/기간으로 필터링합니다."
          right={
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/admin" variant="secondary" size="sm">
                관리자 홈
              </ButtonLink>
              <ButtonLink href="/admin/payouts" variant="secondary" size="sm">
                초기화
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
        <div className="border-b border-white/10 px-6 py-5">
          <form method="get" className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="status">상태</Label>
              <Select id="status" name="status" defaultValue={statusParam}>
                <option value="ALL">전체(REQUESTED+APPROVED)</option>
                <option value="REQUESTED">REQUESTED</option>
                <option value="APPROVED">APPROVED</option>
                <option value="PAID">PAID</option>
                <option value="REJECTED">REJECTED</option>
                <option value="CANCELED">CANCELED</option>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="q">리워더 이메일</Label>
              <Input id="q" name="q" defaultValue={q} placeholder="rewarder@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="from">시작일</Label>
              <DateInput id="from" name="from" defaultValue={props.searchParams?.from ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">종료일</Label>
              <DateInput id="to" name="to" defaultValue={props.searchParams?.to ?? ""} />
            </div>
            <div className="sm:col-span-4 flex flex-wrap items-center gap-2">
              <Button type="submit" variant="primary" size="sm">
                적용
              </Button>
              <div className="text-xs text-zinc-400">최대 50건 표시</div>
            </div>
          </form>
        </div>
        <DividerList>
          {items.length === 0 ? (
            <EmptyState title="조건에 맞는 항목이 없습니다." />
          ) : (
            items.map((r) => (
              <div key={r.id} className="px-6 py-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-zinc-50">{r.amountKrw}원</div>
                      <Pill
                        tone={
                          r.status === "REQUESTED"
                            ? "cyan"
                            : r.status === "APPROVED"
                              ? "indigo"
                              : r.status === "PAID"
                                ? "emerald"
                                : r.status === "REJECTED"
                                  ? "red"
                                  : "neutral"
                        }
                      >
                        {r.status}
                      </Pill>
                    </div>
                    <div className="text-xs text-zinc-400">
                      리워더: {r.rewarder.user.email ?? r.rewarder.id} · 계좌: {r.payoutAccount.bankName}{" "}
                      {r.payoutAccount.accountNumberMasked}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {new Date(r.createdAt).toLocaleString("ko-KR")}
                      {r.failureReason ? ` · 사유: ${r.failureReason}` : ""}
                    </div>
                  </div>
                  <ButtonLink href={`/admin/payouts/${r.id}`} variant="secondary" size="sm">
                    상세/처리
                  </ButtonLink>
                </div>
              </div>
            ))
          )}
        </DividerList>
      </Card>
    </PageShell>
  );
}


