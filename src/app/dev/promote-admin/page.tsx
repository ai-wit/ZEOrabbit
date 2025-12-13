import Link from "next/link";
import { PageHeader, PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Callout, Card, CardBody, Input, Label } from "@/app/_ui/primitives";

export default function PromoteAdminPage() {
  return (
    <PageShell
      size="md"
      header={
        <PageHeader
          eyebrow="DEV"
          title="개발용 관리자 승격"
          description="로컬 개발에서만 사용하세요. 운영 환경에서는 비활성화됩니다."
          right={<ButtonLink href="/" variant="secondary" size="sm">홈</ButtonLink>}
        />
      }
    >
      <div className="space-y-4">
        <Callout tone="warning" title="개발 환경 전용">
          이메일로 가입한 사용자를 ADMIN으로 승격합니다.
        </Callout>

        <Card>
          <CardBody className="space-y-4">
            <form action="/api/dev/promote-admin" method="post" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input id="email" name="email" type="email" required placeholder="admin@example.com" />
              </div>

              <Button type="submit" variant="primary" className="w-full">
                ADMIN으로 승격
              </Button>
            </form>
          </CardBody>
        </Card>

        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/admin" variant="secondary">
            관리자
          </ButtonLink>
        </div>
      </div>
    </PageShell>
  );
}


