import Link from "next/link";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";

export default async function AdminReviewsPage() {
  await requireRole("ADMIN");

  const items = await prisma.participation.findMany({
    where: { status: { in: ["PENDING_REVIEW", "MANUAL_REVIEW"] } },
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
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">검수 대기</h1>
        <div className="text-sm text-zinc-400">최근 50건</div>
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30">
        <div className="divide-y divide-zinc-800">
          {items.length === 0 ? (
            <div className="px-6 py-10 text-sm text-zinc-400">
              검수 대기 건이 없습니다.
            </div>
          ) : (
            items.map((p) => (
              <div key={p.id} className="px-6 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{p.missionDay.campaign.place.name}</div>
                    <div className="mt-1 text-xs text-zinc-400">
                      참여자: {p.rewarder.user.email ?? p.rewarder.id} · 광고주:{" "}
                      {p.missionDay.campaign.advertiser.user.email ?? p.missionDay.campaign.advertiser.id}
                    </div>
                    <div className="mt-2 text-xs text-zinc-500">
                      상태: {p.status} · 제출{" "}
                      {p.submittedAt
                        ? new Date(p.submittedAt).toLocaleString("ko-KR")
                        : "—"}{" "}
                      · 집행일 {new Date(p.missionDay.date).toLocaleDateString("ko-KR")}
                    </div>
                    <div className="mt-2 text-xs text-zinc-400">
                      {p.missionDay.campaign.missionType} · 단가 {p.missionDay.campaign.unitPriceKrw}원 ·
                      리워드 {p.missionDay.campaign.rewardKrw}원
                    </div>
                  </div>

                  <Link
                    href={`/admin/reviews/${p.id}`}
                    className="rounded-md bg-white/10 px-3 py-2 text-xs hover:bg-white/15"
                  >
                    상세/처리
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin"
          className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
        >
          관리자 홈
        </Link>
      </div>
    </main>
  );
}


