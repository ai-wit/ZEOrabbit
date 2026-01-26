"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader, PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Card, CardBody, Input, Label } from "@/app/_ui/primitives";

const TEST_ACCOUNTS = {
  admin: [
    { email: "admin+super@example.com", label: "슈퍼 관리자" },
    { email: "admin+manager@example.com", label: "매니저" },
  ],
  advertiser: [
    { email: "advertiser+1@example.com", label: "광고주 1" },
    { email: "advertiser+2@example.com", label: "광고주 2" },
  ],
  member: [
    { email: "member+normal@example.com", label: "일반 멤버" },
    { email: "member+team-leader@example.com", label: "팀 리더" },
    { email: "member+pro-leader@example.com", label: "프로 리더" },
    { email: "member+normal2@example.com", label: "일반 멤버 2" },
    { email: "member+normal3@example.com", label: "일반 멤버 3" },
    { email: "member+normal4@example.com", label: "일반 멤버 4" },
  ],
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const showTestAccounts = process.env.NODE_ENV !== "production";

  const handleTestLogin = (testEmail: string) => {
    if (!showTestAccounts) return;
    setEmail(testEmail);
    setPassword("password123!");
    // 다음 렌더링에서 form이 submit되도록
    setTimeout(() => {
      const form = document.querySelector('form[action="/api/auth/login"]') as HTMLFormElement;
      if (form) {
        form.requestSubmit();
      }
    }, 0);
  };
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
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

      {showTestAccounts && (
        <Card>
          <CardBody className="space-y-4">
            <div className="text-sm font-medium text-zinc-200">테스트 계정</div>
            <div className="text-xs text-zinc-400">비밀번호: password123!</div>

            <div className="space-y-3">
              <div className="space-y-2">
                <div className="text-xs font-medium text-zinc-200">관리자</div>
                <div className="grid grid-cols-1 gap-2">
                  {TEST_ACCOUNTS.admin.map((account) => (
                    <Button
                      key={account.email}
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => handleTestLogin(account.email)}
                    >
                      {account.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium text-zinc-200">광고주</div>
                <div className="grid grid-cols-1 gap-2">
                  {TEST_ACCOUNTS.advertiser.map((account) => (
                    <Button
                      key={account.email}
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => handleTestLogin(account.email)}
                    >
                      {account.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium text-zinc-200">멤버</div>
                <div className="grid grid-cols-2 gap-2">
                  {TEST_ACCOUNTS.member.map((account) => (
                    <Button
                      key={account.email}
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => handleTestLogin(account.email)}
                    >
                      {account.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </PageShell>
  );
}


