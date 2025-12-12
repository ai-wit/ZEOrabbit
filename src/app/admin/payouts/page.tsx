import Link from "next/link";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";

export default async function AdminPayoutsPage() {
  await requireRole("ADMIN");

  const items = await prisma.payoutRequest.findMany({
    where: { status: { in: ["REQUESTED", "APPROVED"] } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      amountKrw: true,
      status: true,
      createdAt: true,
      failureReason: true,
      rewarder: { select: { id: true, user: { select: { email: true } } } },
      payoutAccount: { select: { bankName: true, accountNumberMasked: true, accountHolderName: true } }
    }
  });

  return (
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">출금 요청</h1>
        <div className="text-sm text-zinc-400">최근 50건</div>
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30">
        <div className="divide-y divide-zinc-800">
          {items.length === 0 ? (
            <div className="px-6 py-10 text-sm text-zinc-400">대기 중인 요청이 없습니다.</div>
          ) : (
            items.map((r) => (
              <div key={r.id} className="px-6 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{r.amountKrw}원</div>
                    <div className="mt-1 text-xs text-zinc-400">
                      상태: {r.status}
                      {r.failureReason ? ` · 사유: ${r.failureReason}` : ""}
                    </div>
                    <div className="mt-2 text-xs text-zinc-400">
                      리워더: {r.rewarder.user.email ?? r.rewarder.id} · 계좌:{" "}
                      {r.payoutAccount.bankName} {r.payoutAccount.accountNumberMasked}
                    </div>
                  </div>
                  <Link
                    href={`/admin/payouts/${r.id}`}
                    className="rounded-md bg-white/10 px-3 py-2 text-xs hover:bg-white/15"
                  >
                    상세/처리
                  </Link>
                </div>
                <div className="mt-2 text-xs text-zinc-500">
                  {new Date(r.createdAt).toLocaleString("ko-KR")}
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


