import { PageHeader } from "@/app/_ui/shell";
import { Button, ButtonLink } from "@/app/_ui/primitives";

interface AdminHeaderProps {
  title: string;
  description: string;
}

export function AdminHeader({ title, description }: AdminHeaderProps) {
  return (
    <PageHeader
      eyebrow="ADMIN"
      title={title}
      description={description}
      right={
        <div className="flex flex-wrap items-center gap-2">
          <ButtonLink href="/admin/managers" variant="secondary" size="sm">
            👥 매니저
          </ButtonLink>
          <ButtonLink href="/admin/advertisers" variant="secondary" size="sm">
            🏢 광고주
          </ButtonLink>
          <ButtonLink href="/admin/experience" variant="secondary" size="sm">
            🎯 체험단
          </ButtonLink>
          <ButtonLink href="/admin/reviews" variant="secondary" size="sm">
            검수 대기
          </ButtonLink>
          <ButtonLink href="/admin/payouts" variant="secondary" size="sm">
            출금 요청
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
  );
}
