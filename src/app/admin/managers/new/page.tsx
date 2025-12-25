'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell } from "@/app/_ui/shell";
import {
  Button,
  ButtonLink,
  Card,
  CardBody,
  Input,
  Label
} from "@/app/_ui/primitives";
import { AdminHeader } from "../../_components/AdminHeader";

export default function NewManagerPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 폼 데이터
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // 폼 입력 핸들러
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null); // 입력 시 에러 초기화
  };

  // 매니저 등록
  const handleCreate = async () => {
    // 유효성 검사
    if (!formData.name.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }

    if (!formData.email.trim()) {
      setError('이메일을 입력해주세요.');
      return;
    }

    // 이메일 형식 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('올바른 이메일 형식을 입력해주세요.');
      return;
    }

    if (!formData.password) {
      setError('비밀번호를 입력해주세요.');
      return;
    }

    if (formData.password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/admin/managers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password
        })
      });

      if (!response.ok) {
        const error = await response.json();
        setError(error.error || '등록 중 오류가 발생했습니다.');
        return;
      }

      const result = await response.json();
      alert('매니저가 성공적으로 등록되었습니다.');

      // 등록된 매니저의 상세 페이지로 이동
      router.push(`/admin/managers/${result.manager.id}`);
    } catch (error) {
      console.error('등록 실패:', error);
      setError('등록 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell
      header={
        <AdminHeader
          title="새 매니저 등록"
          description="새로운 매니저 계정을 생성합니다."
        />
      }
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* 등록 폼 */}
        <Card>
          <CardBody className="space-y-6">
            <div className="text-sm font-semibold text-zinc-50">
              매니저 정보 입력
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/25 bg-red-500/10 p-4">
                <div className="text-sm text-red-100">{error}</div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">이름 *</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="매니저 이름"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="email">이메일 *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="manager@example.com"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="text-xs text-zinc-400">
              이메일 주소는 로그인 시 사용되며, 중복될 수 없습니다.
            </div>
          </CardBody>
        </Card>

        {/* 비밀번호 설정 */}
        <Card>
          <CardBody className="space-y-6">
            <div className="text-sm font-semibold text-zinc-50">
              비밀번호 설정
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="password">비밀번호 *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="8자 이상 입력"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">비밀번호 확인 *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="비밀번호 재입력"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="text-xs text-zinc-400">
              비밀번호는 8자 이상이어야 하며, 안전한 비밀번호를 사용해주세요.
            </div>
          </CardBody>
        </Card>

        {/* 액션 버튼 */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleCreate}
            disabled={saving}
            variant="primary"
          >
            {saving ? '등록 중...' : '매니저 등록'}
          </Button>

          <ButtonLink href="/admin/managers" variant="secondary">
            목록으로 돌아가기
          </ButtonLink>
        </div>
      </div>
    </PageShell>
  );
}
