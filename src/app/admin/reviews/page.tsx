import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { PageHeader, PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Card, DividerList, EmptyState, Input, Label, Pill, Select } from "@/app/_ui/primitives";
import { DateInput } from "@/app/_ui/DateInput";
import type { Prisma, ParticipationStatus } from "@prisma/client";

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

export default async function AdminReviewsPage(props: {
  searchParams?: { status?: string; q?: string; from?: string; to?: string };
}) {
  await requireRole("ADMIN");

  const statusParam = props.searchParams?.status ?? "ALL";
  const q = (props.searchParams?.q ?? "").trim().toLowerCase();
  const from = parseDateOnly(props.searchParams?.from);
  const to = parseDateOnly(props.searchParams?.to);
  const toExclusive = to ? new Date(to.getTime() + 24 * 60 * 60 * 1000) : null;

  const statusFilter =
    statusParam === "PENDING_REVIEW" || statusParam === "MANUAL_REVIEW"
      ? statusParam
      : statusParam === "ALL"
        ? null
        : null;

  const defaultStatuses: ParticipationStatus[] = ["PENDING_REVIEW", "MANUAL_REVIEW"];
  const where: Prisma.ParticipationWhereInput = {
    status: (statusFilter as ParticipationStatus | null)
      ? (statusFilter as ParticipationStatus)
      : { in: defaultStatuses },
    ...(q
      ? {
          OR: [
            { rewarder: { user: { email: { contains: q } } } },
            { missionDay: { campaign: { advertiser: { user: { email: { contains: q } } } } } }
          ]
        }
      : {}),
    ...(from || toExclusive
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(toExclusive ? { lt: toExclusive } : {})
          }
        }
      : {})
  };

  const items = await prisma.participation.findMany({
    where,
    orderBy: { submittedAt: "desc" },
    take: 50,
    select: {
      id: true,
      status: true,
      submittedAt: true,
      createdAt: true,
      rewarder: { select: { id: true, user: { select: { email: true } } } },
      missionDay: {
        select: {
          date: true,
          campaign: {
            select: {
              unitPriceKrw: true,
              rewardKrw: true,
              missionType: true,
              advertiser: { select: { id: true, user: { select: { email: true } } } },
              place: { select: { name: true } }
            }
          }
        }
      }
    }
  });

  return (
    <PageShell
      header={
        <PageHeader
          eyebrow="ADMIN"
          title="검수 대기"
          description="상태/이메일/기간으로 필터링합니다."
          right={
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/admin" variant="secondary" size="sm">
                관리자 홈
              </ButtonLink>
              <ButtonLink href="/admin/reviews" variant="secondary" size="sm">
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
                <option value="ALL">전체(PENDING+MANUAL)</option>
                <option value="PENDING_REVIEW">PENDING_REVIEW</option>
                <option value="MANUAL_REVIEW">MANUAL_REVIEW</option>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="q">이메일</Label>
              <Input id="q" name="q" defaultValue={q} placeholder="참여자/광고주 이메일" />
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
            items.map((p) => (
              <div key={p.id} className="px-6 py-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-zinc-50">
                        {p.missionDay.campaign.place.name}
                      </div>
                      <Pill tone={p.status === "PENDING_REVIEW" ? "cyan" : "indigo"}>{p.status}</Pill>
                    </div>
                    <div className="text-xs text-zinc-400">
                      참여자: {p.rewarder.user.email ?? p.rewarder.id} · 광고주:{" "}
                      {p.missionDay.campaign.advertiser.user.email ?? p.missionDay.campaign.advertiser.id}
                    </div>
                    <div className="text-xs text-zinc-500">
                      제출{" "}
                      {p.submittedAt ? new Date(p.submittedAt).toLocaleString("ko-KR") : "—"} · 집행일{" "}
                      {new Date(p.missionDay.date).toLocaleDateString("ko-KR")}
                    </div>
                    <div className="text-xs text-zinc-400">
                      {p.missionDay.campaign.missionType} · 단가 {p.missionDay.campaign.unitPriceKrw}원 · 리워드{" "}
                      {p.missionDay.campaign.rewardKrw}원
                    </div>
                  </div>

                  <ButtonLink href={`/admin/reviews/${p.id}`} variant="secondary" size="sm">
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


