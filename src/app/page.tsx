import Link from "next/link";
import { getCurrentUser } from "@/server/auth/current-user";

function PrimaryButton(props: { href: string; children: string }) {
  return (
    <Link
      href={props.href}
      className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all"
    >
      {props.children}
    </Link>
  );
}

function SecondaryButton(props: { href: string; children: string }) {
  return (
    <Link
      href={props.href}
      className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-text hover:bg-surface-strong transition-all"
    >
      {props.children}
    </Link>
  );
}

export default async function HomePage() {
  const user = await getCurrentUser();
  const dashboardHref = user
    ? user.role === "ADVERTISER"
      ? "/advertiser"
      : user.role === "MEMBER"
        ? "/member"
        : "/admin"
    : "/login";

  return (
    <main className="mx-auto max-w-3xl space-y-12 py-16">
      {/* Hero Section */}
      <header className="space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight text-text sm:text-6xl">
            지오래빗에 오신 것을 환영합니다
          </h1>
          <p className="mx-auto max-w-xl text-lg leading-relaxed text-text-muted">
            체험단 운영과 리워드 정산을 위한 플랫폼
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          {user ? (
            <>
              <PrimaryButton href={dashboardHref}>대시보드로 이동</PrimaryButton>
              <div className="text-sm text-text-subtle">
                {user.email ?? user.id} ({user.role})
              </div>
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 transition-all"
                >
                  로그아웃
                </button>
              </form>
            </>
          ) : (
            <>
              <PrimaryButton href="/signup">시작하기</PrimaryButton>
              <SecondaryButton href="/login">로그인</SecondaryButton>
            </>
          )}
        </div>
      </header>

      {/* Footer */}
      <footer className="border-t border-border pt-8 text-center">
        <div className="text-xs text-text-subtle">
          © 2024 ZEOrabbit. All rights reserved.
        </div>
      </footer>
    </main>
  );
}


