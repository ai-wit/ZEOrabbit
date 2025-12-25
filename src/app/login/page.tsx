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

      <Card>
        <CardBody className="space-y-3">
          <div className="text-sm font-medium text-zinc-200">테스트 계정</div>
          <div className="text-xs text-zinc-400">비밀번호: password123!</div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-zinc-200">관리자</div>
            <div className="grid grid-cols-1 gap-1 text-xs">
              <div className="text-zinc-300">admin+super@example.com</div>
              <div className="text-zinc-300">admin+manager@example.com</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-zinc-200">광고주</div>
            <div className="grid grid-cols-1 gap-1 text-xs">
              <div className="text-zinc-300">advertiser+1@example.com</div>
              <div className="text-zinc-300">advertiser+2@example.com</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-zinc-200">멤버</div>
            <div className="grid grid-cols-1 gap-1 text-xs">
              <div className="text-zinc-300">member+normal@example.com</div>
              <div className="text-zinc-300">member+team-leader@example.com</div>
              <div className="text-zinc-300">member+pro-leader@example.com</div>
              <div className="text-zinc-300">member+normal2@example.com</div>
              <div className="text-zinc-300">member+normal3@example.com</div>
              <div className="text-zinc-300">member+normal4@example.com</div>
            </div>
          </div>
        </CardBody>
      </Card>
    </PageShell>
  );
}


