"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader, PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Card, CardBody, Input, Label } from "@/app/_ui/primitives";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "요청에 실패했습니다.");
      }
      setMessage("비밀번호 재설정 안내를 이메일로 전송했습니다. 받은편지함과 스팸함을 확인해주세요.");
    } catch (err) {
      console.error("비밀번호 찾기 실패:", err);
      setMessage(err instanceof Error ? err.message : "요청에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      size="sm"
      header={
        <PageHeader
          eyebrow="AUTH"
          title="비밀번호 찾기"
          description="가입한 이메일로 비밀번호 재설정 링크를 보냅니다."
          right={<ButtonLink href="/login" variant="secondary" size="sm">로그인</ButtonLink>}
        />
      }
    >
      <Card>
        <CardBody className="space-y-4">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" variant="primary" className="w-full" disabled={loading}>
              {loading ? "전송 중..." : "재설정 링크 받기"}
            </Button>
          </form>

          {message && (
            <div className="rounded-xl border border-border bg-surface-muted p-3 text-sm text-text">
              {message}
            </div>
          )}

          <div className="text-sm text-text-subtle">
            로그인 화면으로 돌아가시겠어요?{" "}
            <Link href="/login" className="font-semibold text-text hover:underline">
              로그인
            </Link>
          </div>
        </CardBody>
      </Card>
    </PageShell>
  );
}

