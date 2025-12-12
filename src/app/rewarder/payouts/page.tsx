import Link from "next/link";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getRewarderProfileIdByUserId } from "@/server/rewarder/rewarder-profile";
import { getRewarderAvailableBalanceKrw, getRewarderBalanceKrw } from "@/server/rewarder/balance";
import { getPayoutPolicy } from "@/server/policy/get-policy";

export default async function RewarderPayoutsPage() {
  const user = await requireRole("REWARDER");
  const rewarderId = await getRewarderProfileIdByUserId(user.id);

  const balance = await getRewarderBalanceKrw(rewarderId);
  const available = await getRewarderAvailableBalanceKrw(rewarderId);
  const payoutPolicy = await getPayoutPolicy();
  const minPayoutKrw = payoutPolicy?.minPayoutKrw ?? 1000;
  const account = await prisma.payoutAccount.findFirst({
    where: { rewarderId, isPrimary: true },
    select: { id: true, bankName: true, accountNumberMasked: true, accountHolderName: true }
  });

  const requests = await prisma.payoutRequest.findMany({
    where: { rewarderId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, amountKrw: true, status: true, createdAt: true, failureReason: true }
  });

  return (
    <main className="mx-auto max-w-xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">출금/정산</h1>
        <div className="text-sm text-zinc-400">
          현재 잔액: {balance}원 · 출금 가능액: {available}원
        </div>
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 space-y-3">
        <div className="text-sm text-zinc-200">출금 계좌</div>
        {account ? (
          <div className="text-sm text-zinc-300">
            {account.bankName} · {account.accountNumberMasked}
            {account.accountHolderName ? ` · ${account.accountHolderName}` : ""}
          </div>
        ) : (
          <div className="text-sm text-zinc-400">등록된 계좌가 없습니다.</div>
        )}
        <Link
          href="/rewarder/payouts/account"
          className="inline-flex rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
        >
          계좌 등록/변경
        </Link>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 space-y-4">
        <div className="text-sm text-zinc-200">출금 신청</div>
        <form action="/api/rewarder/payouts" method="post" className="space-y-3">
          <input type="hidden" name="payoutAccountId" value={account?.id ?? ""} />
          <div className="space-y-2">
            <label htmlFor="amountKrw" className="text-sm text-zinc-200">
              금액(원)
            </label>
            <input
              id="amountKrw"
              name="amountKrw"
              type="number"
              min={minPayoutKrw}
              step={100}
              required
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
              placeholder={`최소 ${minPayoutKrw}원`}
            />
          </div>
          <button
            type="submit"
            disabled={!account}
            className="w-full rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            출금 신청
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30">
        <div className="border-b border-zinc-800 px-6 py-4 text-sm text-zinc-300">
          최근 신청 {requests.length}건
        </div>
        <div className="divide-y divide-zinc-800">
          {requests.length === 0 ? (
            <div className="px-6 py-10 text-sm text-zinc-400">신청 내역이 없습니다.</div>
          ) : (
            requests.map((r) => (
              <div key={r.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{r.amountKrw}원</div>
                    <div className="mt-1 text-xs text-zinc-400">
                      상태: {r.status}
                      {r.failureReason ? ` · 사유: ${r.failureReason}` : ""}
                    </div>
                  </div>
                  <div className="text-xs text-zinc-500">
                    {new Date(r.createdAt).toLocaleString("ko-KR")}
                  </div>
                </div>
              </div>
            ))
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
      </div>
    </main>
  );
}


