import { requireRole } from "@/server/auth/require-user";
import Link from "next/link";

export default async function RewarderPage() {
  const user = await requireRole("REWARDER");

  return (
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">리워더 대시보드</h1>
        <div className="text-sm text-zinc-400">
          {user.email ?? user.id} ({user.role})
        </div>
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
        <div className="text-sm text-zinc-300">
          Phase 3에서 오늘의 미션/슬롯 확보/인증 업로드를 연결합니다.
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
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
          <Link
            href="/rewarder/payouts"
            className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
          >
            출금/정산
          </Link>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
        >
          홈으로
        </Link>
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="rounded-md bg-red-500/20 px-4 py-2 text-sm hover:bg-red-500/30"
          >
            로그아웃
          </button>
        </form>
      </div>
    </main>
  );
}


