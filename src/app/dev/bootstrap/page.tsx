import Link from "next/link";
import { PageHeader, PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Callout, Card, CardBody, Hint } from "@/app/_ui/primitives";

export default function DevBootstrapPage() {
  return (
    <PageShell
      size="md"
      header={
        <PageHeader
          eyebrow="DEV"
          title="DEV 더미 데이터 생성"
          description="개발 환경에서만 동작합니다. 생성 후 JSON 응답에 로그인 정보가 포함됩니다."
          right={<ButtonLink href="/" variant="secondary" size="sm">홈</ButtonLink>}
        />
      }
    >
      <div className="space-y-4">
        <Callout tone="warning" title="로컬 테스트 전용">
          이 기능은 로컬 개발/테스트를 위한 도구입니다.
        </Callout>

        <Card>
          <CardBody className="space-y-4">
            <form action="/api/dev/bootstrap" method="post" className="space-y-3">
              <Button type="submit" variant="primary" className="w-full">
                더미 데이터 생성(또는 재사용)
              </Button>
              <Hint>생성 후 브라우저가 JSON을 표시합니다. 그 값을 복사해서 로그인에 사용하세요.</Hint>
            </form>
          </CardBody>
        </Card>

        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/login" variant="secondary">
            로그인
          </ButtonLink>
          <ButtonLink href="/admin" variant="secondary">
            관리자
          </ButtonLink>
        </div>
      </div>
    </PageShell>
  );
}


