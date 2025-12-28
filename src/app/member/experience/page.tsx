import { requireRole } from "@/server/auth/require-user";
import { PageHeader, PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink } from "@/app/_ui/primitives";
import dynamic from 'next/dynamic';

// 클라이언트 컴포넌트를 동적으로 로드하여 hydration 문제를 방지
const ExperienceClient = dynamic(() => import('./components/experience-client').then(mod => ({ default: mod.ExperienceClient })), {
  ssr: false,
  loading: () => (
    <div className="space-y-6">
      {/* 탭 스켈레톤 */}
      <div className="border-b border-white/10">
        <nav className="-mb-px flex space-x-8">
          <div className="h-8 w-20 bg-zinc-700/50 rounded animate-pulse"></div>
          <div className="h-8 w-16 bg-zinc-700/50 rounded animate-pulse"></div>
        </nav>
      </div>

      {/* 컨텐츠 스켈레톤 */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="space-y-4">
          <div className="h-6 w-48 bg-zinc-700/50 rounded animate-pulse"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-zinc-700/30 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
});

export default async function ExperiencePage() {
  const user = await requireRole("MEMBER");

  return (
    <PageShell
      header={
        <PageHeader
          eyebrow="EXPERIENCE"
          title="체험단"
          description={`${user.email ?? user.id} (${user.role})`}
          right={
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/member" variant="secondary" size="sm">
                멤버 홈
              </ButtonLink>
              <ButtonLink href="/" variant="secondary" size="sm">
                홈
              </ButtonLink>
              <form action="/api/auth/logout" method="post">
                <Button type="submit" variant="danger" size="sm">
                  로그아웃
                </Button>
              </form>
            </div>
          }
        />
      }
    >
      <ExperienceClient />
    </PageShell>
  );
}
