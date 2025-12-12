import Link from "next/link";
import { getCurrentUser } from "@/server/auth/current-user";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <div className="text-sm text-zinc-400">ZEOrabbit</div>
        <h1 className="text-3xl font-semibold tracking-tight">
          리워드 기반 오픈마켓 플랫폼
        </h1>
        <p className="text-zinc-300">
          광고주(플레이스 운영자)와 리워더를 연결해 트래픽/저장/공유 미션을
          운영합니다.
        </p>
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
        {user ? (
          <div className="space-y-3">
            <div className="text-sm text-zinc-300">
              로그인됨: <span className="font-medium">{user.email ?? user.id}</span>{" "}
              ({user.role})
            </div>
            <div className="flex flex-wrap gap-3">
              {user.role === "ADVERTISER" && (
                <Link
                  href="/advertiser"
                  className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
                >
                  광고주 대시보드
                </Link>
              )}
              {user.role === "REWARDER" && (
                <Link
                  href="/rewarder"
                  className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
                >
                  리워더 대시보드
                </Link>
              )}
              {user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
                >
                  관리자
                </Link>
              )}
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="rounded-md bg-red-500/20 px-4 py-2 text-sm hover:bg-red-500/30"
                >
                  로그아웃
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
            >
              회원가입
            </Link>
            <Link
              href="/login"
              className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
            >
              로그인
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}


