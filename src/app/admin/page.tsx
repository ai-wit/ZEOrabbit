import Link from "next/link";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { toDateOnlyUtc } from "@/server/date/date-only";
import { PageHeader, PageShell } from "@/app/_ui/shell";
import {
  Button,
  ButtonLink,
  Callout,
  Card,
  CardBody,
  DividerList,
  EmptyState,
  KeyValueRow,
  Pill,
  SparkBars,
  StatCard
} from "@/app/_ui/primitives";

function formatNumber(n: number): string {
  return new Intl.NumberFormat("ko-KR").format(n);
}

function formatKrw(n: number): string {
  return `${formatNumber(n)}원`;
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

function dateKeyUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function AdminPage() {
  const user = await requireRole("ADMIN");

  const today = toDateOnlyUtc(new Date());
  const weekStart = toDateOnlyUtc(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const [
    userTotal,
    userAdvertisers,
    userRewarders,
    userAdmins,
    campaignsActive,
    campaignsDraft,
    campaignsPaused,
    pendingReviews,
    pendingManual,
    payoutsRequested,
    payoutsApproved,
    payoutSumRequested,
    payoutSumApproved,
    missionDaysToday,
    quotaAggToday,
    auditLogs,
    reviewQueueItems,
    payoutQueueItems,
    decidedTodayApproved,
    decidedTodayRejected,
    decisionsLast7d,
    payoutsLast7d
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "ADVERTISER" } }),
    prisma.user.count({ where: { role: "REWARDER" } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.campaign.count({ where: { status: "ACTIVE" } }),
    prisma.campaign.count({ where: { status: "DRAFT" } }),
    prisma.campaign.count({ where: { status: "PAUSED" } }),
    prisma.participation.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.participation.count({ where: { status: "MANUAL_REVIEW" } }),
    prisma.payoutRequest.count({ where: { status: "REQUESTED" } }),
    prisma.payoutRequest.count({ where: { status: "APPROVED" } }),
    prisma.payoutRequest.aggregate({ where: { status: "REQUESTED" }, _sum: { amountKrw: true } }),
    prisma.payoutRequest.aggregate({ where: { status: "APPROVED" }, _sum: { amountKrw: true } }),
    prisma.missionDay.count({
      where: { date: today, status: "ACTIVE", campaign: { status: "ACTIVE" } }
    }),
    prisma.missionDay.aggregate({
      where: { date: today, status: "ACTIVE", campaign: { status: "ACTIVE" } },
      _sum: { quotaTotal: true, quotaRemaining: true }
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { id: true, action: true, targetType: true, targetId: true, createdAt: true }
    }),
    prisma.participation.findMany({
      where: { status: { in: ["PENDING_REVIEW", "MANUAL_REVIEW"] } },
      orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
      take: 6,
      select: {
        id: true,
        status: true,
        submittedAt: true,
        createdAt: true,
        rewarder: { select: { user: { select: { email: true } }, id: true } },
        missionDay: { select: { campaign: { select: { place: { select: { name: true } }, missionType: true } } } }
      }
    }),
    prisma.payoutRequest.findMany({
      where: { status: { in: ["REQUESTED", "APPROVED"] } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        status: true,
        amountKrw: true,
        createdAt: true,
        rewarder: { select: { user: { select: { email: true } }, id: true } }
      }
    }),
    prisma.participation.count({
      where: { status: "APPROVED", decidedAt: { gte: today, lt: tomorrow } }
    }),
    prisma.participation.count({
      where: { status: "REJECTED", decidedAt: { gte: today, lt: tomorrow } }
    }),
    prisma.participation.findMany({
      where: {
        decidedAt: { gte: weekStart, lt: tomorrow },
        status: { in: ["APPROVED", "REJECTED"] }
      },
      select: { decidedAt: true, status: true }
    }),
    prisma.payoutRequest.findMany({
      where: { createdAt: { gte: weekStart, lt: tomorrow }, status: { in: ["REQUESTED", "APPROVED"] } },
      select: { createdAt: true, status: true, amountKrw: true }
    })
  ]);

  const quotaTotal = quotaAggToday._sum.quotaTotal ?? 0;
  const quotaRemaining = quotaAggToday._sum.quotaRemaining ?? 0;
  const payoutRequestedSum = payoutSumRequested._sum.amountKrw ?? 0;
  const payoutApprovedSum = payoutSumApproved._sum.amountKrw ?? 0;
  const reviewQueueTotal = pendingReviews + pendingManual;
  const payoutQueueTotal = payoutsRequested + payoutsApproved;

  const days: Date[] = [];
  for (let i = 0; i < 7; i += 1) {
    days.push(toDateOnlyUtc(new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000)));
  }
  const approvedByDay = new Map<string, number>(days.map((d) => [dateKeyUtc(d), 0]));
  const rejectedByDay = new Map<string, number>(days.map((d) => [dateKeyUtc(d), 0]));
  for (const row of decisionsLast7d) {
    if (!row.decidedAt) continue;
    const k = dateKeyUtc(toDateOnlyUtc(row.decidedAt));
    if (row.status === "APPROVED") approvedByDay.set(k, (approvedByDay.get(k) ?? 0) + 1);
    if (row.status === "REJECTED") rejectedByDay.set(k, (rejectedByDay.get(k) ?? 0) + 1);
  }

  const payoutRequestedByDay = new Map<string, number>(days.map((d) => [dateKeyUtc(d), 0]));
  const payoutApprovedByDay = new Map<string, number>(days.map((d) => [dateKeyUtc(d), 0]));
  for (const row of payoutsLast7d) {
    const k = dateKeyUtc(toDateOnlyUtc(row.createdAt));
    if (row.status === "REQUESTED") payoutRequestedByDay.set(k, (payoutRequestedByDay.get(k) ?? 0) + 1);
    if (row.status === "APPROVED") payoutApprovedByDay.set(k, (payoutApprovedByDay.get(k) ?? 0) + 1);
  }

  const approvedSeries = days.map((d) => approvedByDay.get(dateKeyUtc(d)) ?? 0);
  const rejectedSeries = days.map((d) => rejectedByDay.get(dateKeyUtc(d)) ?? 0);
  const payoutReqSeries = days.map((d) => payoutRequestedByDay.get(dateKeyUtc(d)) ?? 0);
  const payoutApprSeries = days.map((d) => payoutApprovedByDay.get(dateKeyUtc(d)) ?? 0);

  return (
    <PageShell
      header={
        <PageHeader
          eyebrow="ADMIN"
          title="관리자"
          description={`${user.email ?? user.id} (${user.role})`}
          right={
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/admin/reviews" variant="secondary" size="sm">
                검수 대기
              </ButtonLink>
              <ButtonLink href="/admin/payouts" variant="secondary" size="sm">
                출금 요청
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
      <div className="space-y-6">
      {reviewQueueTotal > 0 || payoutQueueTotal > 0 ? (
        <Callout tone="info" title="운영 알림">
          검수 대기 <span className="font-semibold">{formatNumber(reviewQueueTotal)}</span>건 · 출금 처리 대기{" "}
          <span className="font-semibold">{formatNumber(payoutQueueTotal)}</span>건
        </Callout>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="검수 대기"
          value={
            <Link href="#review-queue" className="hover:underline underline-offset-4">
              {formatNumber(reviewQueueTotal)}
            </Link>
          }
          hint={`PENDING ${formatNumber(pendingReviews)} · MANUAL ${formatNumber(pendingManual)}`}
          right={
            <Link href="#review-queue" aria-label="검수 큐로 이동" className="hover:opacity-90">
              <Pill tone={reviewQueueTotal > 0 ? "cyan" : "neutral"}>QUEUE</Pill>
            </Link>
          }
          chart={<SparkBars values={approvedSeries} tone="emerald" ariaLabel="최근 7일 승인 추이" />}
        />
        <StatCard
          title="출금 처리 대기"
          value={
            <Link href="#payout-queue" className="hover:underline underline-offset-4">
              {formatNumber(payoutQueueTotal)}
            </Link>
          }
          hint={`REQUESTED ${formatNumber(payoutsRequested)} · APPROVED ${formatNumber(payoutsApproved)}`}
          right={
            <Link href="#payout-queue" aria-label="출금 큐로 이동" className="hover:opacity-90">
              <Pill tone={payoutQueueTotal > 0 ? "indigo" : "neutral"}>PAYOUT</Pill>
            </Link>
          }
          chart={<SparkBars values={payoutReqSeries} tone="cyan" ariaLabel="최근 7일 출금 요청 추이" />}
        />
        <StatCard
          title="오늘 승인/반려"
          value={
            <Link href="#review-queue" className="hover:underline underline-offset-4">
              {formatNumber(decidedTodayApproved)} / {formatNumber(decidedTodayRejected)}
            </Link>
          }
          hint="승인 / 반려 (결정 시각 기준)"
          right={
            <Link href="#review-queue" aria-label="검수 큐로 이동" className="hover:opacity-90">
              <Pill tone="emerald">TODAY</Pill>
            </Link>
          }
          chart={<SparkBars values={rejectedSeries} tone="red" ariaLabel="최근 7일 반려 추이" />}
        />
        <StatCard
          title="오늘의 미션"
          value={
            <Link href="#platform-metrics" className="hover:underline underline-offset-4">
              {formatNumber(missionDaysToday)}
            </Link>
          }
          hint={`총 수량 ${formatNumber(quotaTotal)} · 잔여 ${formatNumber(quotaRemaining)}`}
          right={
            <Link href="#platform-metrics" aria-label="플랫폼 지표로 이동" className="hover:opacity-90">
              <Pill tone="cyan">MISSION</Pill>
            </Link>
          }
        />
        <StatCard
          title="캠페인"
          value={
            <Link href="#platform-metrics" className="hover:underline underline-offset-4">
              {formatNumber(campaignsActive)}
            </Link>
          }
          hint={`ACTIVE ${formatNumber(campaignsActive)} · DRAFT ${formatNumber(campaignsDraft)} · PAUSED ${formatNumber(campaignsPaused)}`}
          right={
            <Link href="#platform-metrics" aria-label="플랫폼 지표로 이동" className="hover:opacity-90">
              <Pill tone="indigo">CAMPAIGN</Pill>
            </Link>
          }
        />
        <StatCard
          title="유저"
          value={
            <Link href="#platform-metrics" className="hover:underline underline-offset-4">
              {formatNumber(userTotal)}
            </Link>
          }
          hint={`ADVERTISER ${formatNumber(userAdvertisers)} · REWARDER ${formatNumber(userRewarders)} · ADMIN ${formatNumber(userAdmins)}`}
          right={
            <Link href="#platform-metrics" aria-label="플랫폼 지표로 이동" className="hover:opacity-90">
              <Pill tone="neutral">USERS</Pill>
            </Link>
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card id="review-queue">
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-zinc-50">검수 큐</div>
                <div className="text-xs text-zinc-400">최근 {formatNumber(reviewQueueItems.length)}건</div>
              </div>
              <ButtonLink href="/admin/reviews" variant="secondary" size="sm">
                전체 보기
              </ButtonLink>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
              <DividerList>
                {reviewQueueItems.length === 0 ? (
                  <EmptyState title="검수 대기 건이 없습니다." />
                ) : (
                  reviewQueueItems.map((p) => (
                    <div key={p.id} className="px-6 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-zinc-50">
                              {p.missionDay.campaign.place.name}
                            </div>
                            <Pill tone={p.status === "PENDING_REVIEW" ? "cyan" : "indigo"}>{p.status}</Pill>
                            <Pill tone="neutral">{p.missionDay.campaign.missionType}</Pill>
                          </div>
                          <div className="text-xs text-zinc-400">
                            참여자: {p.rewarder.user.email ?? p.rewarder.id}
                          </div>
                          <div className="text-xs text-zinc-500">
                            제출: {p.submittedAt ? formatDateTime(p.submittedAt) : "—"} · 생성:{" "}
                            {formatDateTime(p.createdAt)}
                          </div>
                        </div>
                        <ButtonLink href={`/admin/reviews/${p.id}`} variant="secondary" size="sm">
                          처리
                        </ButtonLink>
                      </div>
                    </div>
                  ))
                )}
              </DividerList>
            </div>
          </CardBody>
        </Card>

        <Card id="payout-queue">
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-zinc-50">출금 큐</div>
                <div className="text-xs text-zinc-400">
                  REQUESTED {formatKrw(payoutRequestedSum)} · APPROVED {formatKrw(payoutApprovedSum)}
                </div>
              </div>
              <ButtonLink href="/admin/payouts" variant="secondary" size="sm">
                전체 보기
              </ButtonLink>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
              <DividerList>
                {payoutQueueItems.length === 0 ? (
                  <EmptyState title="대기 중인 출금 요청이 없습니다." />
                ) : (
                  payoutQueueItems.map((r) => (
                    <div key={r.id} className="px-6 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-zinc-50">{formatKrw(r.amountKrw)}</div>
                            <Pill tone={r.status === "REQUESTED" ? "cyan" : "indigo"}>{r.status}</Pill>
                          </div>
                          <div className="text-xs text-zinc-400">
                            리워더: {r.rewarder.user.email ?? r.rewarder.id}
                          </div>
                          <div className="text-xs text-zinc-500">{formatDateTime(r.createdAt)}</div>
                        </div>
                        <ButtonLink href={`/admin/payouts/${r.id}`} variant="secondary" size="sm">
                          처리
                        </ButtonLink>
                      </div>
                    </div>
                  ))
                )}
              </DividerList>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card id="platform-metrics">
          <CardBody className="space-y-4">
            <div className="text-sm font-semibold text-zinc-50">플랫폼 지표</div>
            <div className="space-y-2">
              <KeyValueRow k="기간" v={`${formatDateTime(weekStart)} ~ ${formatDateTime(today)}`} />
              <KeyValueRow k="오늘 미션 잔여율" v={quotaTotal > 0 ? `${Math.round((quotaRemaining / quotaTotal) * 100)}%` : "—"} />
              <KeyValueRow k="출금 대기 금액" v={formatKrw(payoutRequestedSum + payoutApprovedSum)} />
              <KeyValueRow k="캠페인 활성 비율" v={userTotal > 0 ? `${Math.round((campaignsActive / Math.max(1, campaignsActive + campaignsDraft + campaignsPaused)) * 100)}%` : "—"} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <div className="text-xs font-semibold text-zinc-300">최근 7일 승인</div>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <div className="text-sm font-semibold text-zinc-50">{formatNumber(approvedSeries.reduce((a, b) => a + b, 0))}건</div>
                  <SparkBars values={approvedSeries} tone="emerald" ariaLabel="최근 7일 승인" />
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <div className="text-xs font-semibold text-zinc-300">최근 7일 출금 요청</div>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <div className="text-sm font-semibold text-zinc-50">{formatNumber(payoutReqSeries.reduce((a, b) => a + b, 0))}건</div>
                  <SparkBars values={payoutReqSeries} tone="cyan" ariaLabel="최근 7일 출금 요청" />
                </div>
              </div>
            </div>
            <div className="text-xs text-zinc-500">
              * 이 페이지는 운영 상태를 빠르게 파악하기 위한 요약 지표입니다.
            </div>
          </CardBody>
        </Card>

        <Card id="audit-logs">
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-zinc-50">최근 활동</div>
              <Pill tone="neutral">AUDIT</Pill>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
              <DividerList>
                {auditLogs.length === 0 ? (
                  <EmptyState title="활동 로그가 없습니다." />
                ) : (
                  auditLogs.map((l) => (
                    <div key={l.id} className="px-6 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-zinc-50">{l.action}</div>
                          <div className="text-xs text-zinc-400">
                            {l.targetType ? `${l.targetType}${l.targetId ? ` · ${l.targetId}` : ""}` : "—"}
                          </div>
                        </div>
                        <div className="text-xs text-zinc-500">{formatDateTime(l.createdAt)}</div>
                      </div>
                    </div>
                  ))
                )}
              </DividerList>
            </div>
          </CardBody>
        </Card>
      </div>

      </div>
    </PageShell>
  );
}


