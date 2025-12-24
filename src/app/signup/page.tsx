import Link from "next/link";
import { PageHeader, PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Card, CardBody, Hint, Input, Label, Select } from "@/app/_ui/primitives";

export default function SignupPage() {
  return (
    <PageShell
      size="sm"
      header={
        <PageHeader
          eyebrow="AUTH"
          title="회원가입"
          description="역할 선택과 약관 동의 후 가입합니다."
          right={<ButtonLink href="/" variant="secondary" size="sm">홈</ButtonLink>}
        />
      }
    >
      <Card>
        <CardBody className="space-y-5">
          <form action="/api/auth/signup" method="post" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role">역할</Label>
              <Select id="role" name="role" required defaultValue="">
                <option value="" disabled>
                  선택해주세요
                </option>
                <option value="ADVERTISER">광고주(플레이스 운영자)</option>
                <option value="MEMBER">회원(참여자)</option>
              </Select>
              <Hint>회원으로 가입 시 리워더 가이드 동의가 필요합니다.</Hint>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input id="email" name="email" type="email" required placeholder="you@example.com" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input id="password" name="password" type="password" required minLength={8} placeholder="8자 이상" />
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-zinc-950/40 p-4">
              <label className="flex items-start gap-3 text-sm text-zinc-200">
                <input type="checkbox" name="agreeService" value="yes" required className="mt-1" />
                <span>서비스 이용약관에 동의합니다(필수)</span>
              </label>
              <label className="flex items-start gap-3 text-sm text-zinc-200">
                <input type="checkbox" name="agreePrivacy" value="yes" required className="mt-1" />
                <span>개인정보 처리방침에 동의합니다(필수)</span>
              </label>
              <label className="flex items-start gap-3 text-sm text-zinc-200">
                <input type="checkbox" name="agreeRewarderGuide" value="yes" className="mt-1" />
                <span>리워더 행동 가이드에 동의합니다(회원 선택 시 필수)</span>
              </label>
            </div>

            <Button type="submit" variant="primary" className="w-full">
              가입하기
            </Button>
          </form>

          <div className="text-sm text-zinc-400">
            이미 계정이 있나요?{" "}
            <Link href="/login" className="font-semibold text-zinc-200 hover:underline">
              로그인
            </Link>
          </div>
        </CardBody>
      </Card>
    </PageShell>
  );
}


