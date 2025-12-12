import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";

export default async function AdminReviewDetailPage(props: { params: { id: string } }) {
  const admin = await requireRole("ADMIN");

  const participation = await prisma.participation.findUnique({
    where: { id: props.params.id },
    select: {
      id: true,
      status: true,
      submittedAt: true,
      decidedAt: true,
      failureReason: true,
      rewarder: { select: { id: true, user: { select: { email: true } } } },
      missionDay: {
        select: {
          date: true,
          campaign: {
            select: {
              id: true,
              missionType: true,
              unitPriceKrw: true,
              rewardKrw: true,
              advertiser: { select: { id: true, user: { select: { email: true } } } },
              place: { select: { name: true } }
            }
          }
        }
      },
      evidences: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, type: true, fileRef: true, createdAt: true }
      }
    }
  });

  if (!participation) notFound();

  const evidence = participation.evidences[0] ?? null;

  return (
    <main className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">검수 상세</h1>
        <div className="text-sm text-zinc-400">
          관리자: {admin.email ?? admin.id}
        </div>
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 space-y-2">
        <div className="text-sm text-zinc-200">
          {participation.missionDay.campaign.place.name} · {participation.missionDay.campaign.missionType}
        </div>
        <div className="text-xs text-zinc-400">
          참여자: {participation.rewarder.user.email ?? participation.rewarder.id} · 광고주:{" "}
          {participation.missionDay.campaign.advertiser.user.email ??
            participation.missionDay.campaign.advertiser.id}
        </div>
        <div className="text-xs text-zinc-500">
          상태: {participation.status}
          {participation.submittedAt ? ` · 제출: ${new Date(participation.submittedAt).toLocaleString("ko-KR")}` : ""}
          {participation.decidedAt ? ` · 결정: ${new Date(participation.decidedAt).toLocaleString("ko-KR")}` : ""}
        </div>
        {participation.failureReason ? (
          <div className="text-xs text-red-300">사유: {participation.failureReason}</div>
        ) : null}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 space-y-3">
        <div className="text-sm text-zinc-200">증빙(최근 1개)</div>
        {evidence?.fileRef ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={evidence.fileRef}
            alt="evidence"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 object-contain"
          />
        ) : (
          <div className="text-sm text-zinc-400">증빙이 없습니다.</div>
        )}
      </section>

      {(participation.status === "PENDING_REVIEW" || participation.status === "MANUAL_REVIEW") ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
          <div className="flex flex-wrap gap-3">
            <form action={`/api/admin/participations/${participation.id}/approve`} method="post">
              <button
                type="submit"
                className="rounded-md bg-emerald-500/20 px-4 py-2 text-sm hover:bg-emerald-500/30"
              >
                승인
              </button>
            </form>
            <form action={`/api/admin/participations/${participation.id}/reject`} method="post">
              <input
                name="reason"
                className="mr-2 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                placeholder="반려 사유"
                maxLength={200}
                required
              />
              <button
                type="submit"
                className="rounded-md bg-red-500/20 px-4 py-2 text-sm hover:bg-red-500/30"
              >
                반려
              </button>
            </form>
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/reviews"
          className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
        >
          목록
        </Link>
      </div>
    </main>
  );
}


