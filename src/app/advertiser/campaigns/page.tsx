import Link from "next/link";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getAdvertiserProfileIdByUserId } from "@/server/advertiser/advertiser-profile";

export default async function AdvertiserCampaignsPage() {
  const user = await requireRole("ADVERTISER");
  const advertiserId = await getAdvertiserProfileIdByUserId(user.id);

  const campaigns = await prisma.campaign.findMany({
    where: { advertiserId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      missionType: true,
      dailyTarget: true,
      startDate: true,
      endDate: true,
      unitPriceKrw: true,
      rewardKrw: true,
      status: true,
      place: { select: { name: true } }
    }
  });

  return (
    <main className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">캠페인 관리</h1>
          <div className="text-sm text-zinc-400">
            DRAFT로 생성 후 활성화하면 일별 미션이 생성됩니다.
          </div>
        </div>
        <Link
          href="/advertiser/campaigns/new"
          className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
        >
          새 캠페인
        </Link>
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30">
        <div className="border-b border-zinc-800 px-6 py-4 text-sm text-zinc-300">
          총 {campaigns.length}개
        </div>
        <div className="divide-y divide-zinc-800">
          {campaigns.length === 0 ? (
            <div className="px-6 py-10 text-sm text-zinc-400">
              아직 캠페인이 없습니다.
            </div>
          ) : (
            campaigns.map((c) => (
              <div key={c.id} className="px-6 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="mt-1 text-xs text-zinc-400">
                      {c.place.name} · {c.missionType} · 일 {c.dailyTarget}건 ·{" "}
                      {new Date(c.startDate).toLocaleDateString("ko-KR")} ~{" "}
                      {new Date(c.endDate).toLocaleDateString("ko-KR")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-white/10 px-2 py-1 text-xs">
                      {c.status}
                    </span>
                    {c.status === "DRAFT" || c.status === "PAUSED" ? (
                      <form action={`/api/advertiser/campaigns/${c.id}/activate`} method="post">
                        <button
                          type="submit"
                          className="rounded-md bg-emerald-500/20 px-3 py-2 text-xs hover:bg-emerald-500/30"
                        >
                          활성화
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
                <div className="mt-2 text-xs text-zinc-400">
                  단가 {c.unitPriceKrw}원 · 리워드 {c.rewardKrw}원
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="flex gap-3">
        <Link
          href="/advertiser"
          className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
        >
          광고주 홈
        </Link>
      </div>
    </main>
  );
}


