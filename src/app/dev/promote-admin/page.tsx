import Link from "next/link";

export default function PromoteAdminPage() {
  return (
    <main className="mx-auto max-w-lg space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">개발용 관리자 승격</h1>
        <div className="text-sm text-zinc-400">
          로컬 개발에서만 사용하세요. 운영 환경에서는 비활성화됩니다.
        </div>
      </header>

      <section className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
        이 페이지는 <span className="font-semibold">개발 환경 전용</span>입니다.
        이메일로 가입한 사용자를 ADMIN으로 승격합니다.
      </section>

      <form
        action="/api/dev/promote-admin"
        method="post"
        className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-6"
      >
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm text-zinc-200">
            이메일
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
            placeholder="admin@example.com"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
        >
          ADMIN으로 승격
        </button>
      </form>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
        >
          홈
        </Link>
        <Link
          href="/admin"
          className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
        >
          관리자
        </Link>
      </div>
    </main>
  );
}


