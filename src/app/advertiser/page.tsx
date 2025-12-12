import { requireRole } from "@/server/auth/require-user";
import Link from "next/link";

export default async function AdvertiserPage() {
  const user = await requireRole("ADVERTISER");

  return (
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">광고주 대시보드</h1>
        <div className="text-sm text-zinc-400">
          {user.email ?? user.id} ({user.role})
        </div>
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
        <div className="text-sm text-zinc-300">
          Phase 2에서 플레이스/캠페인/리포트를 연결합니다.
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/advertiser/places"
            className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
          >
            플레이스 관리
          </Link>
          <Link
            href="/advertiser/campaigns"
            className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
          >
            캠페인 관리
          </Link>
          <Link
            href="/advertiser/reports"
            className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
          >
            리포트
          </Link>
          <Link
            href="/advertiser/billing"
            className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
          >
            결제/충전
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


