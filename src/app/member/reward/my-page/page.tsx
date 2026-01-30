'use client';

import { useEffect, useState } from 'react';
import { PageShell } from "@/app/_ui/shell";
import { PageHeader } from "@/app/_ui/shell";
import { Button, Card, CardBody, Input, Label } from "@/app/_ui/primitives";
import { RewardNavigation } from "../_components/RewardNavigation";

interface MemberProfile {
  id: string;
  email: string;
  name: string;
  phone: string;
  age: number | null;
  gender: string | null;
  role: string;
}

export default function MemberMyPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<MemberProfile | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/member/profile');
        if (!response.ok) throw new Error('Failed to fetch profile');
        
        const data = await response.json();
        setProfile(data);
        setFormData(prev => ({
          ...prev,
          name: data.name || '',
          age: data.age?.toString() || '',
          gender: data.gender || ''
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!profile) return;

    // Validation
    if (!formData.name.trim()) {
      alert('이름을 입력해주세요.');
      return;
    }

    // Password change validation
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
        name: formData.name.trim(),
        age: formData.age ? parseInt(formData.age, 10) : null,
        gender: formData.gender || null
      };

      // Add password if changing
      if (formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      const response = await fetch('/api/member/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || '정보 수정에 실패했습니다.');
      }

      alert('정보가 성공적으로 수정되었습니다.');
      
      // Reload page to get fresh data
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
          <PageHeader
            eyebrow="REWARDER"
            title="마이페이지"
            description="개인 정보 관리"
            right={<RewardNavigation />}
          />
        }
      >
        <div className="flex items-center justify-center min-h-96">
          <div className="text-lg">로딩 중...</div>
        </div>
      </PageShell>
    );
  }

  if (!profile) {
    return (
      <PageShell
        header={
          <PageHeader
            eyebrow="REWARDER"
            title="마이페이지"
            description="개인 정보 관리"
            right={<RewardNavigation />}
          />
        }
      >
        <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
          <div className="text-lg text-red-500">사용자 정보를 불러올 수 없습니다.</div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      header={
        <PageHeader
          eyebrow="REWARDER"
          title="마이페이지"
          description="개인 정보를 확인하고 수정할 수 있습니다."
          right={<RewardNavigation />}
        />
      }
    >
      <div className="space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="text-red-400">{error}</div>
          </div>
        )}

        {/* Current info */}
        <Card>
          <CardBody className="space-y-4">
            <div className="text-sm font-semibold text-zinc-50">현재 정보</div>
            <div className="grid gap-2 text-sm">
              <div className="text-zinc-400">
                <span className="font-medium">이름:</span> {profile.name || '이름 없음'}
              </div>
              <div className="text-zinc-400">
                <span className="font-medium">이메일:</span> {profile.email}
              </div>
              <div className="text-zinc-400">
                <span className="font-medium">전화번호:</span> {profile.phone || '등록되지 않음'}
              </div>
              <div className="text-zinc-400">
                <span className="font-medium">연령:</span> {profile.age || '미등록'}
              </div>
              <div className="text-zinc-400">
                <span className="font-medium">성별:</span>{' '}
                {profile.gender === 'MALE' ? '남성' : profile.gender === 'FEMALE' ? '여성' : profile.gender === 'OTHER' ? '기타' : '미등록'}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Edit form */}
        <Card>
          <CardBody className="space-y-6">
            <div className="text-sm font-semibold text-zinc-50">정보 수정</div>

            <div className="space-y-4">
              {/* Name */}
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

              {/* Age */}
              <div className="space-y-2">
                <Label htmlFor="age">연령</Label>
                <Input
                  id="age"
                  type="number"
                  value={formData.age}
                  onChange={(e) => handleInputChange('age', e.target.value)}
                  placeholder="나이를 입력하세요"
                  min="1"
                  max="120"
                />
              </div>

              {/* Gender */}
              <div className="space-y-2">
                <Label htmlFor="gender">성별</Label>
                <select
                  id="gender"
                  value={formData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-50 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">선택 안 함</option>
                  <option value="MALE">남성</option>
                  <option value="FEMALE">여성</option>
                  <option value="OTHER">기타</option>
                </select>
              </div>

              {/* Password change */}
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

        {/* Action buttons */}
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
