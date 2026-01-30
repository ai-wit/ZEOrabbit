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
    <div className="mx-auto max-w-3xl space-y-12 py-16">
      {/* Hero Section */}
      <header className="space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight text-text sm:text-6xl">
            지오래빗에 오신 것을 환영합니다
          </h1>
          <p className="mx-auto max-w-xl text-lg leading-relaxed text-text-muted">
            체험단 운영과 리워드 정산을 위한 플랫폼
          </p>
          <div className="pt-2">
            <a
              href="https://www.notion.so/2f20db37412d8042a1afed2938927f32"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-all"
            >
              지오래빗 사용자 매뉴얼
            </a>
          </div>
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
            <div className="grid w-full gap-4 sm:grid-cols-3">
              <Link
                href="/signup?role=MEMBER"
                className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-5 py-6 text-center shadow-sm transition-all hover:border-primary/40 hover:bg-primary/15"
              >
                <span className="text-sm font-semibold text-primary">리워드 시작하기</span>
                <span className="text-xs text-text-muted">
                  참여자 맞춤 리워드 캠페인을 빠르게 시작하세요.
                </span>
              </Link>
              <Link
                href="/signup?role=ADVERTISER"
                className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-emerald-200/70 bg-emerald-50/60 px-5 py-6 text-center shadow-sm transition-all hover:border-emerald-200 hover:bg-emerald-50"
              >
                <span className="text-sm font-semibold text-emerald-700">광고주 시작하기</span>
                <span className="text-xs text-emerald-700/80">
                  매장 성장에 필요한 신뢰도 높은 리워드 운영을 시작하세요.
                </span>
              </Link>
              <Link
                href="/login"
                className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-5 py-6 text-center shadow-sm transition-all hover:bg-surface-strong"
              >
                <span className="text-sm font-semibold text-text">로그인</span>
                <span className="text-xs text-text-muted">
                  이미 계정이 있다면 안전하게 로그인하세요.
                </span>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Footer */}
      <footer className="border-t border-border pt-8">
        <div className="text-center space-y-3">
          <div className="text-xs text-text-subtle leading-relaxed">
            <p>상호 : 지오래빗 | 대표자 : 조진의</p>
            <p>소재지 : 서울특별시 강동구 상일로 74, 322동 201호</p>
            <p>사업자등록번호 : 796-04-03974 | 통신판매신고번호 : 제2026-서울강동-0188호</p>
            <p>개인정보관리책임자 : 조진의</p>
          </div>
          
          <div className="text-xs text-text-subtle leading-relaxed">
            <p>고객센터 : 010-4693-4773 | 평일 : 09:30 ~ 18:30, 점심 : 12:30 ~ 13:30</p>
            <p>토/일/공휴일 휴무 | 이메일 문의 : bon2f2@gmail.com</p>
          </div>

          <div className="flex items-center justify-center gap-4 text-xs">
            <Link href="/terms" className="text-text-subtle hover:text-primary hover:underline transition-colors">
              이용약관
            </Link>
            <span className="text-text-subtle">|</span>
            <Link href="/privacy" className="text-text-subtle hover:text-primary hover:underline transition-colors">
              개인정보처리방침
            </Link>
          </div>

          <div className="text-xs text-text-subtle pt-2">
            ⓒ ZEOrabbit Corp.
          </div>
        </div>
      </footer>
    </div>
  );
}


