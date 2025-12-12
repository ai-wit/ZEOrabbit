import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";

export default async function AdminPayoutDetailPage(props: { params: { id: string } }) {
  await requireRole("ADMIN");

  const req = await prisma.payoutRequest.findUnique({
    where: { id: props.params.id },
    select: {
      id: true,
      amountKrw: true,
      status: true,
      createdAt: true,
      decidedAt: true,
      failureReason: true,
      rewarder: { select: { id: true, user: { select: { email: true } } } },
      payoutAccount: { select: { bankName: true, accountNumberMasked: true, accountHolderName: true } }
    }
  });
  if (!req) notFound();

  return (
    <main className="mx-auto max-w-xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">출금 요청 상세</h1>
        <div className="text-sm text-zinc-400">상태: {req.status}</div>
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 space-y-2">
        <div className="text-sm text-zinc-200">금액: {req.amountKrw}원</div>
        <div className="text-xs text-zinc-400">
          리워더: {req.rewarder.user.email ?? req.rewarder.id}
        </div>
        <div className="text-xs text-zinc-400">
          계좌: {req.payoutAccount.bankName} · {req.payoutAccount.accountNumberMasked}
          {req.payoutAccount.accountHolderName ? ` · ${req.payoutAccount.accountHolderName}` : ""}
        </div>
        <div className="text-xs text-zinc-500">
          생성: {new Date(req.createdAt).toLocaleString("ko-KR")}
          {req.decidedAt ? ` · 결정: ${new Date(req.decidedAt).toLocaleString("ko-KR")}` : ""}
        </div>
        {req.failureReason ? (
          <div className="text-xs text-red-300">사유: {req.failureReason}</div>
        ) : null}
      </section>

      {req.status === "REQUESTED" || req.status === "APPROVED" ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
          <div className="flex flex-wrap gap-3">
            {req.status === "REQUESTED" ? (
              <form action={`/api/admin/payouts/${req.id}/hold`} method="post">
                <button
                  type="submit"
                  className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
                >
                  보류(승인)
                </button>
              </form>
            ) : null}
            <form action={`/api/admin/payouts/${req.id}/approve`} method="post">
              <button
                type="submit"
                className="rounded-md bg-emerald-500/20 px-4 py-2 text-sm hover:bg-emerald-500/30"
              >
                승인(지급 완료 처리)
              </button>
            </form>
            <form action={`/api/admin/payouts/${req.id}/reject`} method="post">
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
          href="/admin/payouts"
          className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
        >
          목록
        </Link>
      </div>
    </main>
  );
}


