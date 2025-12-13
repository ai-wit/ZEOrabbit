import Link from "next/link";
import { requireRole } from "@/server/auth/require-user";
import { getAdvertiserProfileIdByUserId } from "@/server/advertiser/advertiser-profile";
import { prisma } from "@/server/prisma";
import { PageHeader, PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Card, DividerList, EmptyState } from "@/app/_ui/primitives";

export default async function AdvertiserPlacesPage() {
  const user = await requireRole("ADVERTISER");
  const advertiserId = await getAdvertiserProfileIdByUserId(user.id);

  const places = await prisma.place.findMany({
    where: { advertiserId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      externalProvider: true,
      externalId: true,
      createdAt: true
    }
  });

  return (
    <PageShell
      header={
        <PageHeader
          eyebrow="ADVERTISER"
          title="플레이스 관리"
          description="캠페인 생성 전에 대상 플레이스를 등록합니다."
          right={
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/advertiser/places/new" variant="primary" size="sm">
                새 플레이스
              </ButtonLink>
              <ButtonLink href="/advertiser/campaigns" variant="secondary" size="sm">
                캠페인
              </ButtonLink>
              <ButtonLink href="/advertiser/reports" variant="secondary" size="sm">
                리포트
              </ButtonLink>
              <ButtonLink href="/advertiser/billing" variant="secondary" size="sm">
                결제/충전
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
      <Card>
        <div className="border-b border-white/10 px-6 py-4 text-sm text-zinc-300">총 {places.length}개</div>
        <DividerList>
          {places.length === 0 ? (
            <EmptyState title="아직 등록된 플레이스가 없습니다." />
          ) : (
            places.map((p) => (
              <div key={p.id} className="px-6 py-4">
                <div className="text-sm font-semibold text-zinc-50">{p.name}</div>
                <div className="mt-1 text-xs text-zinc-400">
                  {p.externalProvider ?? "—"} {p.externalId ? `(${p.externalId})` : ""} ·{" "}
                  {new Date(p.createdAt).toLocaleString("ko-KR")}
                </div>
              </div>
            ))
          )}
        </DividerList>
      </Card>
    </PageShell>
  );
}


