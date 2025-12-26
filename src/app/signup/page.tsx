'use client';

import Link from "next/link";
import { useState } from "react";
import { PageHeader, PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Card, CardBody, Hint, Input, Label, Select } from "@/app/_ui/primitives";

export default function SignupPage() {
  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [phone, setPhone] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSendVerification = async () => {
    if (!phone) {
      setError("핸드폰 번호를 입력해주세요.");
      return;
    }

    try {
      const response = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsVerificationSent(true);
        setError("");

        // Auto-fill the verification code if provided (development mode)
        if (data.code) {
          setVerificationCode(data.code);
        }

        alert(`인증번호가 발송되었습니다. ${data.code ? '(개발모드: 인증번호가 자동 입력됨)' : '(콘솔에서 확인 가능)'}`);
      } else {
        setError(data.error || "인증번호 발송에 실패했습니다.");
      }
    } catch (error) {
      setError("네트워크 오류가 발생했습니다.");
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      setError("인증번호를 입력해주세요.");
      return;
    }

    try {
      const response = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, code: verificationCode }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsVerified(true);
        setError("");
      } else {
        setError(data.error || "인증번호 확인에 실패했습니다.");
      }
    } catch (error) {
      setError("네트워크 오류가 발생했습니다.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (!isVerified) {
      setError("핸드폰 인증을 완료해주세요.");
      return;
    }

    if (role === "ADVERTISER" && !businessNumber) {
      setError("사업자 번호를 입력해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("role", role);
      formData.append("email", email);
      formData.append("password", password);
      formData.append("name", name);
      formData.append("phone", phone);
      if (role === "ADVERTISER") {
        formData.append("businessNumber", businessNumber);
      }
      formData.append("agreeService", "yes");
      formData.append("agreePrivacy", "yes");
      if (role === "MEMBER") {
        formData.append("agreeRewarderGuide", "yes");
      }

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        window.location.href = role === "ADVERTISER" ? "/advertiser" : "/member";
      } else {
        setError("회원 가입에 실패했습니다. 다시 시도해주세요.");
      }
    } catch (error) {
      setError("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
          {error && (
            <div className="text-sm text-red-400 bg-red-950/20 border border-red-900/20 rounded-lg p-3">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role">역할</Label>
              <Select id="role" name="role" required value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="" disabled>
                  선택해주세요
                </option>
                <option value="ADVERTISER">광고주(플레이스 운영자)</option>
                <option value="MEMBER">회원(참여자)</option>
              </Select>
              <Hint>회원으로 가입 시 리워더 가이드 동의가 필요합니다.</Hint>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                placeholder="실명을 입력해주세요"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

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
              <Label htmlFor="phone">핸드폰 번호</Label>
              <div className="flex gap-2">
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  placeholder="010-1234-5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleSendVerification}
                  disabled={isVerificationSent}
                >
                  {isVerificationSent ? "재발송" : "인증요청"}
                </Button>
              </div>
              {isVerificationSent && !isVerified && (
                <div className="flex gap-2 mt-2">
                  <Input
                    type="text"
                    placeholder="인증번호 6자리"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="flex-1"
                    maxLength={6}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleVerifyCode}
                    disabled={!verificationCode}
                  >
                    확인
                  </Button>
                </div>
              )}
              {isVerified && (
                <div className="text-sm text-green-400 mt-1">
                  ✓ 인증이 완료되었습니다.
                </div>
              )}
            </div>

            {role === "ADVERTISER" && (
              <div className="space-y-2">
                <Label htmlFor="businessNumber">사업자 번호</Label>
                <Input
                  id="businessNumber"
                  name="businessNumber"
                  type="text"
                  required
                  placeholder="123-45-67890"
                  value={businessNumber}
                  onChange={(e) => setBusinessNumber(e.target.value)}
                />
                <Hint>사업자 등록증에 기재된 번호를 입력해주세요.</Hint>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="8자 이상"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordConfirm">비밀번호 확인</Label>
              <Input
                id="passwordConfirm"
                name="passwordConfirm"
                type="password"
                required
                minLength={8}
                placeholder="비밀번호를 다시 입력해주세요"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
              />
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
              {role === "MEMBER" && (
                <label className="flex items-start gap-3 text-sm text-zinc-200">
                  <input type="checkbox" name="agreeRewarderGuide" value="yes" required className="mt-1" />
                  <span>리워더 행동 가이드에 동의합니다(회원 선택 시 필수)</span>
                </label>
              )}
            </div>

            <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "가입 중..." : "가입하기"}
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


