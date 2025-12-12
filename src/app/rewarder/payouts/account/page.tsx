import Link from "next/link";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getRewarderProfileIdByUserId } from "@/server/rewarder/rewarder-profile";

export default async function RewarderPayoutAccountPage() {
  const user = await requireRole("REWARDER");
  const rewarderId = await getRewarderProfileIdByUserId(user.id);

  const account = await prisma.payoutAccount.findFirst({
    where: { rewarderId, isPrimary: true },
    select: { id: true, bankName: true, accountNumberMasked: true, accountHolderName: true }
  });

  return (
    <main className="mx-auto max-w-lg space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">출금 계좌</h1>
        <div className="text-sm text-zinc-400">현재 Primary 계좌를 관리합니다.</div>
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 space-y-2">
        <div className="text-sm text-zinc-200">현재 계좌</div>
        {account ? (
          <div className="text-sm text-zinc-300">
            {account.bankName} · {account.accountNumberMasked}
            {account.accountHolderName ? ` · ${account.accountHolderName}` : ""}
          </div>
        ) : (
          <div className="text-sm text-zinc-400">등록된 계좌가 없습니다.</div>
        )}
      </section>

      <form
        action="/api/rewarder/payout-accounts"
        method="post"
        className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-6"
      >
        <div className="space-y-2">
          <label htmlFor="bankName" className="text-sm text-zinc-200">
            은행명
          </label>
          <input
            id="bankName"
            name="bankName"
            required
            maxLength={100}
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
            placeholder="예: 국민은행"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="accountNumber" className="text-sm text-zinc-200">
            계좌번호
          </label>
          <input
            id="accountNumber"
            name="accountNumber"
            required
            maxLength={64}
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
            placeholder="숫자/하이픈 포함 가능"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="accountHolderName" className="text-sm text-zinc-200">
            예금주명(선택)
          </label>
          <input
            id="accountHolderName"
            name="accountHolderName"
            maxLength={100}
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
            placeholder="예: 홍길동"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
        >
          Primary 계좌로 저장
        </button>
      </form>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/rewarder/payouts"
          className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
        >
          출금/정산
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


