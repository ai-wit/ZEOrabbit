import Link from "next/link";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getRewarderProfileIdByUserId } from "@/server/rewarder/rewarder-profile";
import { toDateOnlyUtc } from "@/server/date/date-only";

export default async function RewarderMissionsPage() {
  const user = await requireRole("REWARDER");
  const rewarderId = await getRewarderProfileIdByUserId(user.id);

  const today = toDateOnlyUtc(new Date());

  const missions = await prisma.missionDay.findMany({
    where: {
      date: today,
      status: "ACTIVE",
      campaign: { status: "ACTIVE", missionType: "TRAFFIC" }
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      quotaRemaining: true,
      quotaTotal: true,
      campaign: {
        select: {
          id: true,
          name: true,
          missionType: true,
          rewardKrw: true,
          place: { select: { name: true } }
        }
      }
    }
  });

  const activeMyParticipation = await prisma.participation.findMany({
    where: {
      rewarderId,
      status: { in: ["IN_PROGRESS", "PENDING_REVIEW", "MANUAL_REVIEW"] },
      missionDay: { date: today }
    },
    select: { id: true, missionDayId: true, status: true }
  });
  const myByMissionDayId = new Map(activeMyParticipation.map((p) => [p.missionDayId, p]));

  return (
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">오늘의 미션</h1>
        <div className="text-sm text-zinc-400">
          오늘 가능한 미션을 확인하고 슬롯을 확보하세요.
        </div>
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30">
        <div className="border-b border-zinc-800 px-6 py-4 text-sm text-zinc-300">
          총 {missions.length}개
        </div>
        <div className="divide-y divide-zinc-800">
          {missions.length === 0 ? (
            <div className="px-6 py-10 text-sm text-zinc-400">
              오늘 가능한 미션이 없습니다.
            </div>
          ) : (
            missions.map((m) => {
              const mine = myByMissionDayId.get(m.id);
              return (
                <div key={m.id} className="px-6 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{m.campaign.place.name}</div>
                      <div className="mt-1 text-xs text-zinc-400">
                        {m.campaign.name} · {m.campaign.missionType} · 리워드{" "}
                        {m.campaign.rewardKrw}원
                      </div>
                      <div className="mt-2 text-xs text-zinc-400">
                        남은 수량 {m.quotaRemaining} / {m.quotaTotal}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {mine ? (
                        <Link
                          href={`/rewarder/participations/${mine.id}`}
                          className="rounded-md bg-white/10 px-3 py-2 text-xs hover:bg-white/15"
                        >
                          내 진행 중({mine.status})
                        </Link>
                      ) : m.quotaRemaining > 0 ? (
                        <form action="/api/rewarder/participations" method="post">
                          <input type="hidden" name="missionDayId" value={m.id} />
                          <button
                            type="submit"
                            className="rounded-md bg-emerald-500/20 px-3 py-2 text-xs hover:bg-emerald-500/30"
                          >
                            시작하기(슬롯 확보)
                          </button>
                        </form>
                      ) : (
                        <span className="rounded-md bg-white/5 px-3 py-2 text-xs text-zinc-400">
                          수량 소진
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/rewarder"
          className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
        >
          리워더 홈
        </Link>
        <Link
          href="/rewarder/participations"
          className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
        >
          내 참여 내역
        </Link>
      </div>
    </main>
  );
}


