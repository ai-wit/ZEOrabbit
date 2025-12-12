import Link from "next/link";

export default function SignupPage() {
  return (
    <main className="mx-auto max-w-md space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">회원가입</h1>
        <p className="text-sm text-zinc-400">
          역할 선택과 약관 동의 후 가입합니다.
        </p>
      </header>

      <form
        action="/api/auth/signup"
        method="post"
        className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-6"
      >
        <div className="space-y-2">
          <label className="text-sm text-zinc-200" htmlFor="role">
            역할
          </label>
          <select
            id="role"
            name="role"
            required
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
            defaultValue=""
          >
            <option value="" disabled>
              선택해주세요
            </option>
            <option value="ADVERTISER">광고주(플레이스 운영자)</option>
            <option value="REWARDER">리워더(참여자)</option>
          </select>
        </div>

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
            placeholder="8자 이상"
          />
        </div>

        <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="agreeService"
              value="yes"
              required
              className="mt-1"
            />
            <span className="text-zinc-200">
              서비스 이용약관에 동의합니다(필수)
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="agreePrivacy"
              value="yes"
              required
              className="mt-1"
            />
            <span className="text-zinc-200">
              개인정보 처리방침에 동의합니다(필수)
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="agreeRewarderGuide"
              value="yes"
              className="mt-1"
            />
            <span className="text-zinc-200">
              리워더 행동 가이드에 동의합니다(리워더 선택 시 필수)
            </span>
          </label>
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
        >
          가입하기
        </button>
      </form>

      <div className="text-sm text-zinc-400">
        이미 계정이 있나요?{" "}
        <Link href="/login" className="text-zinc-200 hover:underline">
          로그인
        </Link>
      </div>
    </main>
  );
}


