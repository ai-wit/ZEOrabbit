'use client';

import { useContext, useEffect, useState } from 'react';
import { PageShell } from "@/app/_ui/shell";
import { AdminHeader } from "@/app/admin/_components/AdminHeader";
import { Button, ButtonLink, Card, CardBody, Input, Label } from "@/app/_ui/primitives";
import { AdminContext } from "@/app/admin/AdminProvider";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  adminType: string;
}

export default function AdminMyPage() {
  const adminData = useContext(AdminContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 수정 폼 데이터
  const [formData, setFormData] = useState({
    name: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // AdminContext의 user가 변경될 때마다 폼 데이터 업데이트
  useEffect(() => {
    if (adminData?.user) {
      setFormData(prev => ({
        ...prev,
        name: adminData.user.name || ''
      }));
      setLoading(false);
    }
  }, [adminData?.user]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!adminData?.user) return;

    // 유효성 검사
    if (!formData.name.trim()) {
      alert('이름을 입력해주세요.');
      return;
    }

    // 비밀번호 변경 시 검증
    if (formData.newPassword || formData.confirmPassword) {
      if (!formData.currentPassword) {
        alert('현재 비밀번호를 입력해주세요.');
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        alert('새 비밀번호가 일치하지 않습니다.');
        return;
      }
      if (formData.newPassword.length < 6) {
        alert('새 비밀번호는 6자리 이상이어야 합니다.');
        return;
      }
    }

    try {
      setSaving(true);
      setError(null);

      const updateData: any = {
        name: formData.name.trim()
      };

      // 비밀번호 변경 시 추가
      if (formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      const response = await fetch('/api/admin/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '정보 수정에 실패했습니다.');
      }

      const result = await response.json();

      alert('정보가 성공적으로 수정되었습니다.');

      // 페이지 리로드하여 서버에서 최신 데이터 가져오기
      window.location.reload();
    } catch (error) {
      console.error('정보 수정 실패:', error);
      setError(error instanceof Error ? error.message : '정보 수정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageShell
        header={
          <AdminHeader
            title="마이페이지"
            description="개인 정보 관리"
          />
        }
      >
        <div className="flex items-center justify-center min-h-96">
          <div className="text-lg">로딩 중...</div>
        </div>
      </PageShell>
    );
  }

  if (!adminData?.user) {
    return (
      <PageShell
        header={
          <AdminHeader
            title="마이페이지"
            description="개인 정보 관리"
          />
        }
      >
        <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
          <div className="text-lg text-red-500">사용자 정보를 불러올 수 없습니다.</div>
          <ButtonLink href="/admin" variant="secondary">
            관리자 페이지로 돌아가기
          </ButtonLink>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      header={
        <AdminHeader
          title="마이페이지"
          description="개인 정보를 확인하고 수정할 수 있습니다."
        />
      }
    >
      <div className="space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="text-red-400">{error}</div>
          </div>
        )}

        {/* 현재 정보 표시 */}
        <Card>
          <CardBody className="space-y-4">
            <div className="text-sm font-semibold text-zinc-50">현재 정보</div>
            <div className="grid gap-2 text-sm">
              <div className="text-zinc-400">
                <span className="font-medium">이름:</span> {adminData.user.name || '이름 없음'}
              </div>
              <div className="text-zinc-400">
                <span className="font-medium">이메일:</span> {adminData.user.email}
              </div>
              <div className="text-zinc-400">
                <span className="font-medium">권한:</span> {adminData.user.adminType === 'SUPER' ? '슈퍼관리자' : adminData.user.adminType === 'MANAGER' ? '매니저' : '관리자'}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 정보 수정 */}
        <Card>
          <CardBody className="space-y-6">
            <div className="text-sm font-semibold text-zinc-50">정보 수정</div>

            <div className="space-y-4">
              {/* 이름 수정 */}
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="이름을 입력하세요"
                />
              </div>

              {/* 비밀번호 변경 */}
              <div className="space-y-4">
                <div className="text-sm font-medium text-zinc-50">비밀번호 변경 (선택사항)</div>

                <div className="space-y-2">
                  <Label htmlFor="currentPassword">현재 비밀번호</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={formData.currentPassword}
                    onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                    placeholder="현재 비밀번호를 입력하세요"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">새 비밀번호</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={formData.newPassword}
                      onChange={(e) => handleInputChange('newPassword', e.target.value)}
                      placeholder="새 비밀번호를 입력하세요"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      placeholder="새 비밀번호를 다시 입력하세요"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 액션 버튼 */}
        <div className="flex flex-wrap gap-3 justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            variant="primary"
          >
            {saving ? '저장 중...' : '저장'}
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
