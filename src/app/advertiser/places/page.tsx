import Link from "next/link";
import { requireRole } from "@/server/auth/require-user";
import { getAdvertiserProfileIdByUserId } from "@/server/advertiser/advertiser-profile";
import { prisma } from "@/server/prisma";
import { PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Card, DividerList, EmptyState } from "@/app/_ui/primitives";
import { AdvertiserHeader } from "../_components/AdvertiserHeader";

export default async function AdvertiserPlacesPage() {
  const user = await requireRole("ADVERTISER");
  const advertiserId = await getAdvertiserProfileIdByUserId(user.id);

  const places = await prisma.place.findMany({
    where: { advertiserId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      url: true,
      externalProvider: true,
      externalId: true,
      createdAt: true
    }
  });

  return (
    <PageShell
      header={
        <AdvertiserHeader
          title="플레이스 관리"
          description="캠페인 생성 전에 대상 플레이스를 등록합니다."
        />
      }
    >
      <div className="mb-6 flex justify-end">
        <ButtonLink href="/advertiser/places/new" variant="primary" size="sm">
          새 플레이스
        </ButtonLink>
      </div>
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
                  {p.url ? (
                    <>
                      <Link
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-zinc-300 hover:underline underline-offset-4"
                      >
                        네이버 플레이스
                      </Link>{" "}
                      ·{" "}
                    </>
                  ) : null}
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


