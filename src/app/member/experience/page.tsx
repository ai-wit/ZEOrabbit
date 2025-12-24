import { requireRole } from "@/server/auth/require-user";
import { PageHeader, PageShell } from "@/app/_ui/shell";
import { ButtonLink, Card, CardBody } from "@/app/_ui/primitives";

export default async function MemberExperienceSystemPage() {
  const user = await requireRole("MEMBER");

  return (
    <PageShell
      header={
        <PageHeader
          eyebrow="체험단 시스템"
          title="대시보드"
          description={`${user.email ?? user.id}`}
          right={
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/member" variant="secondary" size="sm">
                시스템 선택
              </ButtonLink>
              <ButtonLink href="/" variant="secondary" size="sm">
                홈
              </ButtonLink>
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-red-600 text-white hover:bg-red-700 h-8 px-3 py-1"
                >
                  로그아웃
                </button>
              </form>
            </div>
          }
        />
      }
    >
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardBody className="p-12 text-center">
            <div className="mb-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-600 flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-zinc-50 mb-4">체험단 시스템</h2>
              <p className="text-xl text-zinc-400 mb-8">
                다양한 제품과 서비스를 체험하고 솔직한 리뷰를 작성하는 시스템입니다.
              </p>
            </div>

            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl p-8 border border-purple-500/20">
              <div className="text-6xl mb-4">🚧</div>
              <h3 className="text-2xl font-bold text-zinc-50 mb-2">준비중입니다</h3>
              <p className="text-zinc-400 mb-6">
                체험단 시스템은 현재 개발 중에 있습니다.
                <br />
                곧 새로운 체험 기회를 제공해 드리겠습니다!
              </p>
              <div className="text-sm text-zinc-500">
                예상 출시일: 2025년 1월
              </div>
            </div>

            <div className="mt-8">
              <ButtonLink href="/member" variant="secondary">
                시스템 선택으로 돌아가기
              </ButtonLink>
            </div>
          </CardBody>
        </Card>
      </div>
    </PageShell>
  );
}
