import Link from "next/link";
import { requireRole } from "@/server/auth/require-user";
import { getAdvertiserProfileIdByUserId } from "@/server/advertiser/advertiser-profile";
import { getAdvertiserBudgetBalanceKrw } from "@/server/advertiser/balance";
import { prisma } from "@/server/prisma";

export default async function AdvertiserBillingPage() {
  const user = await requireRole("ADVERTISER");
  const advertiserId = await getAdvertiserProfileIdByUserId(user.id);

  const balance = await getAdvertiserBudgetBalanceKrw(advertiserId);

  const payments = await prisma.payment.findMany({
    where: { advertiserId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, amountKrw: true, status: true, provider: true, createdAt: true }
  });

  const ledgers = await prisma.budgetLedger.findMany({
    where: { advertiserId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, amountKrw: true, reason: true, refId: true, createdAt: true }
  });

  return (
    <main className="mx-auto max-w-xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">결제/충전</h1>
        <div className="text-sm text-zinc-400">현재 예산 잔액: {balance}원</div>
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 space-y-4">
        <div className="text-sm text-zinc-200">충전</div>
        <form action="/api/advertiser/topups" method="post" className="space-y-3">
          <div className="space-y-2">
            <label htmlFor="amountKrw" className="text-sm text-zinc-200">
              금액(원)
            </label>
            <input
              id="amountKrw"
              name="amountKrw"
              type="number"
              min={1000}
              step={1000}
              required
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
              placeholder="예: 50000"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
          >
            충전(DEV 즉시 반영)
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30">
        <div className="border-b border-zinc-800 px-6 py-4 text-sm text-zinc-300">
          최근 결제 {payments.length}건
        </div>
        <div className="divide-y divide-zinc-800">
          {payments.length === 0 ? (
            <div className="px-6 py-10 text-sm text-zinc-400">결제 내역이 없습니다.</div>
          ) : (
            payments.map((p) => (
              <div key={p.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{p.amountKrw}원</div>
                    <div className="mt-1 text-xs text-zinc-400">
                      {p.status} · {p.provider ?? "—"}
                    </div>
                  </div>
                  <div className="text-xs text-zinc-500">
                    {new Date(p.createdAt).toLocaleString("ko-KR")}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30">
        <div className="border-b border-zinc-800 px-6 py-4 text-sm text-zinc-300">
          최근 원장 {ledgers.length}건
        </div>
        <div className="divide-y divide-zinc-800">
          {ledgers.length === 0 ? (
            <div className="px-6 py-10 text-sm text-zinc-400">원장 내역이 없습니다.</div>
          ) : (
            ledgers.map((l) => (
              <div key={l.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">
                      {l.amountKrw > 0 ? "+" : ""}
                      {l.amountKrw}원
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">
                      {l.reason} {l.refId ? `· ref=${l.refId}` : ""}
                    </div>
                  </div>
                  <div className="text-xs text-zinc-500">
                    {new Date(l.createdAt).toLocaleString("ko-KR")}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
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


