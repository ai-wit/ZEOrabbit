'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell } from "@/app/_ui/shell";
import {
  Button,
  ButtonLink,
  Card,
  CardBody,
  DividerList,
  EmptyState,
  Input,
  Label,
  Pill
} from "@/app/_ui/primitives";
import { AdminHeader } from "../../_components/AdminHeader";

interface Manager {
  id: string;
  email: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Advertiser {
  id: string;
  user: {
    name: string;
    email: string;
  };
  places: Array<{
    id: string;
    name: string;
  }>;
  campaigns: Array<{
    id: string;
    name?: string;
  }>;
}

interface ManagerDetailData {
  manager: Manager;
  advertisers: Advertiser[];
  assignmentCount: number;
}

function formatDateTime(d: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(d));
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("ko-KR").format(n);
}

export default function ManagerDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<ManagerDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 폼 데이터
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // 데이터 로드
  useEffect(() => {
    loadData();
  }, [params.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/managers/${params.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError('존재하지 않는 매니저입니다.');
        } else if (response.status === 403) {
          setError('권한이 없습니다.');
        } else {
          setError('데이터 로드 중 오류가 발생했습니다.');
        }
        return;
      }

      const result = await response.json();
      setData(result);

      // 폼 초기화
      setFormData({
        name: result.manager.name,
        email: result.manager.email,
        password: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      setError('데이터 로드 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 폼 입력 핸들러
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 정보 수정
  const handleUpdate = async () => {
    if (!data) return;

    // 유효성 검사
    if (!formData.name.trim()) {
      alert('이름을 입력해주세요.');
      return;
    }

    if (!formData.email.trim()) {
      alert('이메일을 입력해주세요.');
      return;
    }

    // 이메일 형식 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert('올바른 이메일 형식을 입력해주세요.');
      return;
    }

    // 비밀번호 변경 시 확인
    if (formData.password) {
      if (formData.password.length < 8) {
        alert('비밀번호는 8자 이상이어야 합니다.');
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        alert('비밀번호가 일치하지 않습니다.');
        return;
      }
    }

    try {
      setSaving(true);

      const updateData: any = {
        name: formData.name.trim(),
        email: formData.email.trim()
      };

      if (formData.password) {
        updateData.password = formData.password;
      }

      const response = await fetch(`/api/admin/managers/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || '수정 중 오류가 발생했습니다.');
        return;
      }

      alert('매니저 정보가 성공적으로 수정되었습니다.');
      loadData(); // 데이터 새로고침

      // 비밀번호 필드 초기화
      setFormData(prev => ({
        ...prev,
        password: '',
        confirmPassword: ''
      }));
    } catch (error) {
      console.error('수정 실패:', error);
      alert('수정 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 매니저 삭제
  const handleDelete = async () => {
    if (!data) return;

    if (!confirm('정말로 이 매니저를 삭제하시겠습니까?\n삭제된 매니저는 복구할 수 없습니다.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/managers/${params.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || '삭제 중 오류가 발생했습니다.');
        return;
      }

      alert('매니저가 성공적으로 삭제되었습니다.');
      router.push('/admin/managers');
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <PageShell
        header={
          <AdminHeader
            title="매니저 상세"
            description="매니저 정보를 조회하고 수정합니다."
          />
        }
      >
        <div className="flex items-center justify-center min-h-96">
          <div className="text-lg">로딩 중...</div>
        </div>
      </PageShell>
    );
  }

  if (error || !data) {
    return (
      <PageShell
        header={
          <AdminHeader
            title="매니저 상세"
            description="매니저 정보를 조회하고 수정합니다."
          />
        }
      >
        <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
          <div className="text-lg text-red-500">{error || '데이터를 불러올 수 없습니다.'}</div>
          <ButtonLink href="/admin/managers" variant="secondary">
            목록으로 돌아가기
          </ButtonLink>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      header={
        <AdminHeader
          title="매니저 상세"
          description="매니저 정보를 조회하고 수정합니다."
        />
      }
    >
      <div className="space-y-6">
        {/* 기본 정보 수정 */}
        <Card>
          <CardBody className="space-y-6">
            <div className="text-sm font-semibold text-zinc-50">
              기본 정보 수정
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="매니저 이름"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="매니저 이메일"
                />
              </div>
            </div>

            <div className="text-sm text-zinc-400">
              등록일: {formatDateTime(data.manager.createdAt)}
            </div>
          </CardBody>
        </Card>

        {/* 비밀번호 변경 */}
        <Card>
          <CardBody className="space-y-6">
            <div className="text-sm font-semibold text-zinc-50">
              비밀번호 변경
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="password">새 비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="새 비밀번호 (8자 이상)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="비밀번호 확인"
                />
              </div>
            </div>

            <div className="text-xs text-zinc-500">
              비밀번호를 변경하지 않으려면 필드를 비워두세요.
            </div>
          </CardBody>
        </Card>

        {/* 할당된 광고주 목록 */}
        <Card>
          <CardBody className="space-y-4">
            <div className="text-sm font-semibold text-zinc-50">
              할당된 광고주 ({formatNumber(data.assignmentCount)}개)
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
              <DividerList>
                {data.advertisers.length === 0 ? (
                  <EmptyState title="할당된 광고주가 없습니다." />
                ) : (
                  data.advertisers.map((advertiser) => (
                    <div key={advertiser.id} className="px-6 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-zinc-50">
                              {advertiser.user.name}
                            </div>
                            <Pill tone="indigo">
                              광고주
                            </Pill>
                          </div>
                          <div className="text-xs text-zinc-400">
                            {advertiser.user.email}
                          </div>
                          <div className="text-xs text-zinc-500">
                            장소: {formatNumber(advertiser.places.length)}개 · 캠페인: {formatNumber(advertiser.campaigns.length)}개
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </DividerList>
            </div>
          </CardBody>
        </Card>

        {/* 액션 버튼 */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleUpdate}
            disabled={saving}
            variant="primary"
          >
            {saving ? '저장 중...' : '정보 수정'}
          </Button>

          <Button
            onClick={handleDelete}
            variant="danger"
            disabled={saving}
          >
            매니저 삭제
          </Button>

          <ButtonLink href="/admin/managers" variant="secondary">
            목록으로 돌아가기
          </ButtonLink>
        </div>
      </div>
    </PageShell>
  );
}
