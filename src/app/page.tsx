import type { ReactNode } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/server/auth/current-user";

function Badge(props: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200">
      <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/90" aria-hidden="true" />
      {props.children}
    </span>
  );
}

function SectionTitle(props: { eyebrow?: string; title: string; desc?: string }) {
  return (
    <div className="space-y-3">
      {props.eyebrow ? (
        <div className="inline-flex items-center gap-2 text-xs font-medium tracking-wide text-cyan-200/90">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/90" aria-hidden="true" />
          {props.eyebrow}
        </div>
      ) : null}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">
          {props.title}
        </h2>
        {props.desc ? <p className="text-sm text-zinc-300">{props.desc}</p> : null}
      </div>
    </div>
  );
}

function Card(props: {
  title: string;
  desc: string;
  icon: ReactNode;
  tone?: "cyan" | "indigo" | "emerald";
}) {
  const tone =
    props.tone === "indigo"
      ? "from-indigo-500/15 via-indigo-500/0 to-transparent"
      : props.tone === "emerald"
        ? "from-emerald-500/15 via-emerald-500/0 to-transparent"
        : "from-cyan-500/15 via-cyan-500/0 to-transparent";

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tone} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
        aria-hidden="true"
      />
      <div className="relative space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
            {props.icon}
          </div>
          <div className="text-sm font-semibold text-zinc-50">{props.title}</div>
        </div>
        <p className="text-sm leading-relaxed text-zinc-300">{props.desc}</p>
      </div>
    </div>
  );
}

function StepCard(props: { n: string; title: string; desc: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/25 to-cyan-500/10 text-sm font-semibold text-zinc-50 ring-1 ring-white/10">
          {props.n}
        </div>
        <div className="space-y-1">
          <div className="text-sm font-semibold text-zinc-50">{props.title}</div>
          <div className="text-sm text-zinc-300">{props.desc}</div>
        </div>
      </div>
    </div>
  );
}

function PrimaryButton(props: { href: string; children: ReactNode }) {
  return (
    <Link
      href={props.href}
      className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-[0_10px_30px_-12px_rgba(34,211,238,0.45)] hover:opacity-95"
    >
      {props.children}
    </Link>
  );
}

function SecondaryButton(props: { href: string; children: ReactNode }) {
  return (
    <Link
      href={props.href}
      className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-zinc-50 hover:bg-white/10"
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
    <main className="space-y-16">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-950/60 p-7 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] sm:p-10">
        <div
          className="pointer-events-none absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.35),transparent_60%)] blur-2xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-44 right-[-120px] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.25),transparent_60%)] blur-2xl"
          aria-hidden="true"
        />
        <div className="relative space-y-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-100">
              <span className="h-2 w-2 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400" aria-hidden="true" />
              LocalMom
            </span>
            <span className="text-xs text-zinc-400">
              체험단 운영과 리워드 시스템을 정책 기반으로 연결하는 로컬 홍보 플랫폼
            </span>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.3fr,0.7fr] lg:items-center">
            <div className="space-y-6">
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
                로컬 매장 <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-cyan-200">체험단 운영</span>과
                <br className="hidden sm:block" /> 투명한 리워드 시스템을 한 곳에서
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-zinc-300">
                광고주는 예산과 단가를 정책으로 통제하며 캠페인을 운영하고, 회원은 검증된 참여 흐름으로
                안전하게 리워드를 적립/출금합니다. 운영 로그와 보안 정책으로 신뢰를 기본값으로 설계했습니다.
              </p>

              <div className="flex flex-wrap gap-2">
                <Badge>정책 기반 가격/리밋</Badge>
                <Badge>검증(자동/수동) 워크플로우</Badge>
                <Badge>정산/출금 추적 가능</Badge>
                <Badge>IP 차단 · 감사 로그</Badge>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                {user ? (
                  <>
                    <PrimaryButton href={dashboardHref}>대시보드로 이동</PrimaryButton>
                    <div className="text-xs text-zinc-400">
                      로그인됨: <span className="font-medium text-zinc-200">{user.email ?? user.id}</span> ({user.role})
                    </div>
                    <form action="/api/auth/logout" method="post">
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-100 hover:bg-red-500/15"
                      >
                        로그아웃
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <PrimaryButton href="/signup">광고주로 시작하기</PrimaryButton>
                    <SecondaryButton href="/signup">회원으로 시작하기</SecondaryButton>
                    <SecondaryButton href="/login">로그인</SecondaryButton>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="space-y-5">
                <div className="text-sm font-semibold text-zinc-50">운영 신뢰를 만드는 기본 원칙</div>
                <ul className="space-y-3 text-sm text-zinc-300">
                  <li className="flex gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-cyan-300/90" aria-hidden="true" />
                    <span>정책(단가/리밋/출금) 기반으로 운영 일관성 유지</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-indigo-300/90" aria-hidden="true" />
                    <span>증빙 기반 검증 + 관리자 리뷰로 품질 관리</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-emerald-300/90" aria-hidden="true" />
                    <span>감사 로그/차단 정책으로 부정 행위 리스크 최소화</span>
                  </li>
                </ul>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="text-xs text-zinc-400">미션 타입</div>
                    <div className="mt-1 text-sm font-semibold text-zinc-50">TRAFFIC · SAVE · SHARE</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="text-xs text-zinc-400">검증</div>
                    <div className="mt-1 text-sm font-semibold text-zinc-50">자동 + 수동</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="text-xs text-zinc-400">정산</div>
                    <div className="mt-1 text-sm font-semibold text-zinc-50">추적 가능</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <SectionTitle
          eyebrow="FEATURES"
          title="운영의 ‘번거로움’은 줄이고, 신뢰는 높입니다"
          desc="캠페인 운영·검증·정산을 한 흐름으로 연결해, 참여 품질과 운영 효율을 동시에 확보합니다."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card
            tone="indigo"
            title="미션 기반 성과 운영"
            desc="트래픽/저장/공유 미션으로 목표에 맞는 행동을 설계하고, 일 단위 운영으로 통제력을 확보합니다."
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-indigo-200" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M4 18h2V9H4v9Zm7 0h2V6h-2v12Zm7 0h2V12h-2v6Z"
                />
              </svg>
            }
          />
          <Card
            tone="cyan"
            title="증빙 기반 검증 흐름"
            desc="증빙 업로드 → 자동 판정 → 필요 시 수동 리뷰로 연결해 참여 품질을 일정하게 유지합니다."
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-cyan-200" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0-20Zm-1 14l-4-4l1.4-1.4L11 13.2l5.6-5.6L18 9l-7 7Z"
                />
              </svg>
            }
          />
          <Card
            tone="emerald"
            title="정산/출금 추적 가능"
            desc="리워드 적립과 출금 요청의 상태를 명확히 분리해, 운영·회계 관점에서도 흐름이 투명합니다."
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-emerald-200" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 1a11 11 0 1 0 0 22A11 11 0 0 0 12 1Zm1 17h-2v-2h2v2Zm1.6-8.9l-.9 1c-.4.4-.7.8-.7 1.9h-2v-.5c0-.8.3-1.6.9-2.2l1.2-1.2c.3-.3.5-.7.5-1.1a2 2 0 0 0-4 0H7a4 4 0 1 1 8 0c0 .9-.4 1.7-1.1 2.1Z"
                />
              </svg>
            }
          />
          <Card
            tone="cyan"
            title="정책 엔진(가격/리밋/출금)"
            desc="운영 정책을 데이터로 관리해, 환경/상황에 맞춰 안전하게 기준을 변경하고 적용합니다."
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-cyan-200" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.14 7.14 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 1h-3.8a.5.5 0 0 0-.49.42l-.36 2.54c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 7.48a.5.5 0 0 0 .12.64L4.86 9.7c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.4 1.05.71 1.63.94l.36 2.54c.05.24.25.42.49.42h3.8c.24 0 .45-.18.49-.42l.36-2.54c.58-.23 1.12-.54 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"
                />
              </svg>
            }
          />
          <Card
            tone="indigo"
            title="보안 기본값"
            desc="세션 기반 인증, IP 차단, 감사 로그 등 운영에 필요한 보안 장치를 기본 제공하도록 설계했습니다."
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-indigo-200" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 1l8 4v6c0 5-3.4 9.7-8 11c-4.6-1.3-8-6-8-11V5l8-4Zm0 6a3 3 0 0 0-3 3v2H8v7h8v-7h-1v-2a3 3 0 0 0-3-3Zm1 5h-2v-2a1 1 0 0 1 2 0v2Z"
                />
              </svg>
            }
          />
          <Card
            tone="emerald"
            title="운영 자동화"
            desc="참여 만료/캠페인 종료 등 반복 작업을 자동화해 운영 비용을 줄이고 리스크를 낮춥니다."
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-emerald-200" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 4a8 8 0 1 0 8 8h-2a6 6 0 1 1-6-6V4Zm1 0v7h7a8 8 0 0 0-7-7Z"
                />
              </svg>
            }
          />
          <Card
            tone="indigo"
            title="체험단 기반 로컬 홍보"
            desc="실제 매장 방문과 체험을 통해 생성된 양질의 콘텐츠로 신뢰할 수 있는 로컬 홍보를 실현합니다."
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-indigo-200" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5Z"
                />
              </svg>
            }
          />
        </div>
      </section>

      <section className="space-y-8">
        <SectionTitle
          eyebrow="HOW IT WORKS"
          title="운영 흐름은 단순하게, 기준은 명확하게"
          desc="캠페인 생성부터 검증/정산까지의 단계를 명확히 분리해, 운영 실수와 커뮤니케이션 비용을 줄입니다."
        />
        <div className="grid gap-4 lg:grid-cols-4">
          <StepCard n="1" title="캠페인 생성" desc="플레이스/미션 타입/단가/기간을 설정합니다." />
          <StepCard n="2" title="참여 진행" desc="회원이 참여하고 증빙을 제출합니다." />
          <StepCard n="3" title="검증/리뷰" desc="자동 판정 후 필요 시 관리자 리뷰로 확정합니다." />
          <StepCard n="4" title="정산/출금" desc="리워드 적립 및 출금 요청을 추적합니다." />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-7">
          <SectionTitle
            eyebrow="FOR ADVERTISERS"
            title="광고주: 예산 통제 + 성과 행동 유도"
            desc="플레이스 운영 목적에 맞게 행동을 정의하고, 단가/정책으로 예산을 안정적으로 관리하세요."
          />
          <div className="mt-6 space-y-3 text-sm text-zinc-300">
            <div className="flex gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-indigo-300/90" aria-hidden="true" />
              <span>체험단 운영을 쉽게 설정하고 양질의 사용자 생성 콘텐츠로 매장 홍보</span>
            </div>
            <div className="flex gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-cyan-300/90" aria-hidden="true" />
              <span>일 단위 미션 운영으로 과집행을 방지</span>
            </div>
            <div className="flex gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-emerald-300/90" aria-hidden="true" />
              <span>검증 흐름으로 참여 품질 기준을 유지</span>
            </div>
            <div className="flex gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-indigo-300/90" aria-hidden="true" />
              <span>운영 로그로 이슈 대응과 정산 근거 확보</span>
            </div>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            {user?.role === "ADVERTISER" ? (
              <PrimaryButton href="/advertiser">광고주 대시보드</PrimaryButton>
            ) : (
              <PrimaryButton href="/signup">광고주로 시작하기</PrimaryButton>
            )}
            <SecondaryButton href="/advertiser/products">상품 둘러보기</SecondaryButton>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-7">
          <SectionTitle
            eyebrow="FOR REWARDERS"
            title="회원: 간단 참여 + 투명한 리워드"
            desc="미션 참여 → 증빙 제출 → 검증 완료 후 적립. 흐름이 명확해 불확실성을 줄입니다."
          />
          <div className="mt-6 space-y-3 text-sm text-zinc-300">
            <div className="flex gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-cyan-300/90" aria-hidden="true" />
              <span>로컬 매장을 체험하면서 수익도 얻는 체험단 참여로 가치 실현</span>
            </div>
            <div className="flex gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-indigo-300/90" aria-hidden="true" />
              <span>검증 상태가 명확해 결과를 예측 가능</span>
            </div>
            <div className="flex gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-emerald-300/90" aria-hidden="true" />
              <span>보상/출금 정책이 공개되어 혼선 최소화</span>
            </div>
            <div className="flex gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-cyan-300/90" aria-hidden="true" />
              <span>부정 행위 방지로 건강한 생태계 유지</span>
            </div>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            {user?.role === "MEMBER" ? (
              <PrimaryButton href="/member">회원 대시보드</PrimaryButton>
            ) : (
              <PrimaryButton href="/signup">회원으로 시작하기</PrimaryButton>
            )}
            <SecondaryButton href="/rewarder/missions">미션 보기</SecondaryButton>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-zinc-50">바로 시작해보세요</div>
            <div className="text-sm text-zinc-300">
              체험단 운영과 리워드 시스템을 하나의 워크플로우로. 로컬 매장과 회원이 함께 성장하는 생태계를 만듭니다.
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {user ? (
              <PrimaryButton href={dashboardHref}>대시보드로 이동</PrimaryButton>
            ) : (
              <PrimaryButton href="/signup">회원가입</PrimaryButton>
            )}
            <SecondaryButton href="/login">로그인</SecondaryButton>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 pt-10">
        <div className="grid gap-8 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-zinc-50">LocalMom</div>
            <p className="text-sm text-zinc-400">
              광고주와 회원을 연결하는 미션 운영 플랫폼. 정책 기반 운영과 투명한 정산을 목표로 합니다.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div className="space-y-2">
              <div className="font-semibold text-zinc-200">시작하기</div>
              <div className="space-y-1 text-zinc-400">
                <Link className="block hover:text-zinc-200" href="/signup">
                  회원가입
                </Link>
                <Link className="block hover:text-zinc-200" href="/login">
                  로그인
                </Link>
                <Link className="block hover:text-zinc-200" href={dashboardHref}>
                  대시보드
                </Link>
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-zinc-200">운영</div>
              <div className="space-y-1 text-zinc-400">
                <span className="block">정책 기반 운영</span>
                <span className="block">검증/리뷰 워크플로우</span>
                <span className="block">감사 로그/차단 정책</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-10 text-xs text-zinc-500">
          © LocalMom. All rights reserved.
        </div>
      </footer>
    </main>
  );
}


