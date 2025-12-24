import { requireRole } from "@/server/auth/require-user";
import { PageHeader, PageShell } from "@/app/_ui/shell";
import { ButtonLink, Card, CardBody } from "@/app/_ui/primitives";

export default async function MemberSystemSelectorPage() {
  const user = await requireRole("MEMBER");

  return (
    <PageShell
      header={
        <PageHeader
          eyebrow="멤버"
          title="시스템 선택"
          description={`${user.email ?? user.id}`}
          right={
            <div className="flex flex-wrap gap-2">
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
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-zinc-50 mb-4">활동 시스템 선택</h2>
          <p className="text-lg text-zinc-400">
            참여하고 싶은 활동 시스템을 선택하세요
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* 리워드 시스템 */}
          <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300">
            <CardBody className="p-8 text-center">
              <div className="mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-600 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-zinc-50 mb-2">리워드 시스템</h3>
                <p className="text-zinc-400 mb-6">
                  미션 참여를 통해 리워드를 적립하고 출금할 수 있는 시스템입니다.
                  <br />
                  매일 미션에 참여하여 포인트를 쌓아보세요.
                </p>
              </div>
              <ButtonLink
                href="/member/reward"
                variant="primary"
                size="md"
                className="w-full"
              >
                리워드 시스템 시작하기
              </ButtonLink>
            </CardBody>
          </Card>

          {/* 체험단 시스템 */}
          <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300">
            <CardBody className="p-8 text-center">
              <div className="mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-400 to-pink-600 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-zinc-50 mb-2">체험단 시스템</h3>
                <p className="text-zinc-400 mb-6">
                  다양한 제품과 서비스를 체험하고 솔직한 리뷰를 작성하는 시스템입니다.
                  <br />
                  새로운 경험을 통해 다양한 혜택을 누려보세요.
                </p>
              </div>
              <ButtonLink
                href="/member/experience"
                variant="primary"
                size="md"
                className="w-full"
              >
                체험단 시스템 시작하기
              </ButtonLink>
            </CardBody>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-zinc-500">
            각 시스템은 독립적으로 운영되며, 필요에 따라 시스템을 변경할 수 있습니다.
          </p>
        </div>
      </div>
    </PageShell>
  );
}


