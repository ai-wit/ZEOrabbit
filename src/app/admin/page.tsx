import { requireRole } from "@/server/auth/require-user";
import Link from "next/link";

export default async function AdminPage() {
  const user = await requireRole("ADMIN");

  return (
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">관리자</h1>
        <div className="text-sm text-zinc-400">
          {user.email ?? user.id} ({user.role})
        </div>
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
        <div className="text-sm text-zinc-300">
          Phase 4~5에서 검수/정산/제재 화면을 연결합니다.
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/admin/reviews"
            className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
          >
            검수 대기
          </Link>
          <Link
            href="/admin/payouts"
            className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
          >
            출금 요청
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


