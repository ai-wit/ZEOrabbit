import Link from "next/link";
import { PageHeader, PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Card, CardBody, Input, Label } from "@/app/_ui/primitives";

export default function LoginPage() {
  return (
    <PageShell
      size="sm"
      header={
        <PageHeader
          eyebrow="AUTH"
          title="로그인"
          description="이메일/비밀번호로 로그인합니다."
          right={<ButtonLink href="/" variant="secondary" size="sm">홈</ButtonLink>}
        />
      }
    >
      <Card>
        <CardBody className="space-y-4">
          <form action="/api/auth/login" method="post" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input id="email" name="email" type="email" required placeholder="you@example.com" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="********"
              />
            </div>

            <Button type="submit" variant="primary" className="w-full">
              로그인
            </Button>
          </form>

          <div className="text-sm text-zinc-400">
            계정이 없나요?{" "}
            <Link href="/signup" className="font-semibold text-zinc-200 hover:underline">
              회원가입
            </Link>
          </div>
        </CardBody>
      </Card>
    </PageShell>
  );
}


