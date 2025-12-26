import { PageHeader } from "@/app/_ui/shell";
import { Button, ButtonLink } from "@/app/_ui/primitives";

interface AdvertiserHeaderProps {
  title: string;
  description: string;
}

export function AdvertiserHeader({ title, description }: AdvertiserHeaderProps) {
  return (
    <PageHeader
      eyebrow="ADVERTISER"
      title={title}
      description={description}
      right={
        <div className="flex flex-wrap items-center gap-2">
          <ButtonLink href="/" variant="secondary" size="sm">
            홈
          </ButtonLink>
          <ButtonLink href="/advertiser" variant="secondary" size="sm">
            광고주 홈
          </ButtonLink>
          <ButtonLink href="/advertiser/places" variant="secondary" size="sm">
            플레이스
          </ButtonLink>
          <ButtonLink href="/advertiser/campaigns" variant="secondary" size="sm">
            캠페인
          </ButtonLink>
          <ButtonLink href="/advertiser/reports" variant="secondary" size="sm">
            리포트
          </ButtonLink>
          <ButtonLink href="/advertiser/billing" variant="secondary" size="sm">
            결제/충전
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
