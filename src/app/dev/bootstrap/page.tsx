import Link from "next/link";

export default function DevBootstrapPage() {
  return (
    <main className="mx-auto max-w-lg space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">DEV 더미 데이터 생성</h1>
        <div className="text-sm text-zinc-400">
          개발 환경에서만 동작합니다. 생성 후 JSON 응답에 로그인 정보가 포함됩니다.
        </div>
      </header>

      <section className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
        이 기능은 <span className="font-semibold">로컬 테스트용</span>입니다.
      </section>

      <form
        action="/api/dev/bootstrap"
        method="post"
        className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-6"
      >
        <button
          type="submit"
          className="w-full rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
        >
          더미 데이터 생성(또는 재사용)
        </button>
        <div className="text-xs text-zinc-400">
          생성 후 브라우저가 JSON을 표시합니다. 그 값을 복사해서 로그인에 사용하세요.
        </div>
      </form>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
        >
          홈
        </Link>
        <Link
          href="/login"
          className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
        >
          로그인
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


