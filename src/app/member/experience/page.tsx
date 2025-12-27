import { requireRole } from "@/server/auth/require-user";
import { PageHeader, PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink } from "@/app/_ui/primitives";
import { ExperienceClient } from './components/experience-client';

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
