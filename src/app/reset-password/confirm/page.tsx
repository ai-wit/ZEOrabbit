"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader, PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Card, CardBody, Input, Label } from "@/app/_ui/primitives";

function ResetPasswordConfirmContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") || "";
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const tokenMissing = useMemo(() => !token, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== passwordConfirm) {
      setMessage("비밀번호가 일치하지 않습니다.");
      return;
    }
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "비밀번호 재설정에 실패했습니다.");
      }
      setSuccess(true);
      setMessage("비밀번호가 변경되었습니다. 다시 로그인해주세요.");
    } catch (err) {
      console.error("비밀번호 재설정 실패:", err);
      setMessage(err instanceof Error ? err.message : "비밀번호 재설정에 실패했습니다.");
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
          title="비밀번호 재설정"
          description="새 비밀번호를 입력해주세요."
          right={<ButtonLink href="/login" variant="secondary" size="sm">로그인</ButtonLink>}
        />
      }
    >
      <Card>
        <CardBody className="space-y-4">
          {tokenMissing ? (
            <div className="rounded-xl border border-border bg-surface-muted p-3 text-sm text-text">
              재설정 링크가 올바르지 않습니다. 다시 요청해주세요.
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="password">새 비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  minLength={8}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passwordConfirm">새 비밀번호 확인</Label>
                <Input
                  id="passwordConfirm"
                  type="password"
                  minLength={8}
                  required
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                />
              </div>
              <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                {loading ? "변경 중..." : "비밀번호 변경"}
              </Button>
            </form>
          )}

          {message && (
            <div className="rounded-xl border border-border bg-surface-muted p-3 text-sm text-text">
              {message}
            </div>
          )}

          {success ? (
            <div className="text-sm text-text-subtle">
              <Link href="/login" className="font-semibold text-text hover:underline">
                로그인으로 이동
              </Link>
            </div>
          ) : (
            <div className="text-sm text-text-subtle">
              비밀번호 찾기를 다시 하려면{" "}
              <Link href="/reset-password" className="font-semibold text-text hover:underline">
                재설정 링크 요청
              </Link>
            </div>
          )}
        </CardBody>
      </Card>
    </PageShell>
  );
}

export default function ResetPasswordConfirmPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordConfirmContent />
    </Suspense>
  );
}

