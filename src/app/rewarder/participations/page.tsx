import Link from "next/link";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getRewarderProfileIdByUserId } from "@/server/rewarder/rewarder-profile";

export default async function RewarderParticipationsPage() {
  const user = await requireRole("REWARDER");
  const rewarderId = await getRewarderProfileIdByUserId(user.id);

  const participations = await prisma.participation.findMany({
    where: { rewarderId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      status: true,
      createdAt: true,
      expiresAt: true,
      submittedAt: true,
      decidedAt: true,
      failureReason: true,
      missionDay: {
        select: {
          date: true,
          campaign: {
            select: {
              missionType: true,
              rewardKrw: true,
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
        <h1 className="text-2xl font-semibold tracking-tight">내 참여 내역</h1>
        <div className="text-sm text-zinc-400">최근 50건까지 표시합니다.</div>
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30">
        <div className="divide-y divide-zinc-800">
          {participations.length === 0 ? (
            <div className="px-6 py-10 text-sm text-zinc-400">
              참여 내역이 없습니다.
            </div>
          ) : (
            participations.map((p) => (
              <div key={p.id} className="px-6 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{p.missionDay.campaign.place.name}</div>
                    <div className="mt-1 text-xs text-zinc-400">
                      {p.missionDay.campaign.missionType} · 리워드 {p.missionDay.campaign.rewardKrw}
                      원 · 집행일{" "}
                      {new Date(p.missionDay.date).toLocaleDateString("ko-KR")}
                    </div>
                    <div className="mt-2 text-xs text-zinc-400">
                      상태: {p.status}
                      {p.failureReason ? ` · 사유: ${p.failureReason}` : ""}
                    </div>
                  </div>

                  <Link
                    href={`/rewarder/participations/${p.id}`}
                    className="rounded-md bg-white/10 px-3 py-2 text-xs hover:bg-white/15"
                  >
                    상세
                  </Link>
                </div>
                <div className="mt-2 text-xs text-zinc-500">
                  생성 {new Date(p.createdAt).toLocaleString("ko-KR")} · 만료{" "}
                  {new Date(p.expiresAt).toLocaleString("ko-KR")}
                  {p.submittedAt ? ` · 제출 ${new Date(p.submittedAt).toLocaleString("ko-KR")}` : ""}
                  {p.decidedAt ? ` · 결정 ${new Date(p.decidedAt).toLocaleString("ko-KR")}` : ""}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/rewarder/missions"
          className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
        >
          오늘의 미션
        </Link>
        <Link
          href="/rewarder"
          className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
        >
          리워더 홈
        </Link>
      </div>
    </main>
  );
}


