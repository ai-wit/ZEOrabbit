import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">로그인</h1>
        <p className="text-sm text-zinc-400">
          이메일/비밀번호로 로그인합니다.
        </p>
      </header>

      <form
        action="/api/auth/login"
        method="post"
        className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-6"
      >
        <div className="space-y-2">
          <label className="text-sm text-zinc-200" htmlFor="email">
            이메일
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-zinc-200" htmlFor="password">
            비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
            placeholder="********"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
        >
          로그인
        </button>
      </form>

      <div className="text-sm text-zinc-400">
        계정이 없나요?{" "}
        <Link href="/signup" className="text-zinc-200 hover:underline">
          회원가입
        </Link>
      </div>
    </main>
  );
}


