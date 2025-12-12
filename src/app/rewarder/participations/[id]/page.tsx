import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getRewarderProfileIdByUserId } from "@/server/rewarder/rewarder-profile";

export default async function RewarderParticipationDetailPage(props: {
  params: { id: string };
}) {
  const user = await requireRole("REWARDER");
  const rewarderId = await getRewarderProfileIdByUserId(user.id);

  const participation = await prisma.participation.findFirst({
    where: { id: props.params.id, rewarderId },
    select: {
      id: true,
      status: true,
      expiresAt: true,
      submittedAt: true,
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
      },
      evidences: { orderBy: { createdAt: "desc" }, take: 3, select: { id: true, type: true, createdAt: true } }
    }
  });

  if (!participation) notFound();

  const now = Date.now();
  const expired = now > new Date(participation.expiresAt).getTime();

  return (
    <main className="mx-auto max-w-xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">미션 상세</h1>
        <div className="text-sm text-zinc-400">
          {participation.missionDay.campaign.place.name} ·{" "}
          {participation.missionDay.campaign.missionType} · 리워드{" "}
          {participation.missionDay.campaign.rewardKrw}원
        </div>
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 space-y-2">
        <div className="text-sm text-zinc-300">상태: {participation.status}</div>
        <div className="text-xs text-zinc-500">
          만료: {new Date(participation.expiresAt).toLocaleString("ko-KR")}
          {expired ? " (만료됨)" : ""}
          {participation.submittedAt
            ? ` · 제출: ${new Date(participation.submittedAt).toLocaleString("ko-KR")}`
            : ""}
        </div>
        {participation.failureReason ? (
          <div className="text-xs text-red-300">사유: {participation.failureReason}</div>
        ) : null}
      </section>

      {participation.status === "IN_PROGRESS" && !expired ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 space-y-4">
          <div className="text-sm text-zinc-300">
            인증 스크린샷 1장을 업로드하세요.
          </div>
          <form
            action={`/api/rewarder/participations/${participation.id}/evidence`}
            method="post"
            encType="multipart/form-data"
            className="space-y-4"
          >
            <input
              type="file"
              name="screenshot"
              accept="image/png,image/jpeg,image/webp"
              required
              className="block w-full text-sm text-zinc-200"
            />
            <button
              type="submit"
              className="w-full rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
            >
              인증 제출
            </button>
          </form>
        </section>
      ) : null}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
        <div className="text-sm text-zinc-300">최근 증빙</div>
        <div className="mt-3 space-y-2">
          {participation.evidences.length === 0 ? (
            <div className="text-xs text-zinc-500">아직 업로드된 증빙이 없습니다.</div>
          ) : (
            participation.evidences.map((e) => (
              <div key={e.id} className="text-xs text-zinc-500">
                {e.type} · {new Date(e.createdAt).toLocaleString("ko-KR")}
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
          href="/rewarder/participations"
          className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
        >
          내 참여 내역
        </Link>
      </div>
    </main>
  );
}


