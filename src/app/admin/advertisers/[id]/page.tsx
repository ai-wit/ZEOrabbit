'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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

interface Place {
  id: string;
  name: string;
  address: string;
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
  }>;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  missionType: string;
  startDate: string;
  endDate: string;
}

interface Manager {
  id: string;
  name: string;
  email: string;
  assignedBy: string;
  assignedAt: string;
}

interface ManagerSearchResult {
  id: string;
  name: string;
  email: string;
  _count: {
    managedAdvertisers: number;
  };
}

interface BudgetLedger {
  id: string;
  amountKrw: number;
  reason: string;
  createdAt: string;
}

interface Payment {
  id: string;
  amountKrw: number;
  status: string;
  createdAt: string;
}

interface AdvertiserDetailData {
  id: string;
  email: string;
  name: string;
  displayName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  places: Place[];
  campaigns: Campaign[];
  managers: Manager[];
  recentBudgetLedgers: BudgetLedger[];
  recentPayments: Payment[];
  stats: {
    placesCount: number;
    campaignsCount: number;
    managersCount: number;
  };
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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    minimumFractionDigits: 0
  }).format(amount);
}

export default function AdvertiserDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<AdvertiserDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const isManager = (user: any): boolean => {
    return user?.role === 'ADMIN' && user?.adminType === 'MANAGER';
  };

  // 매니저 검색 관련 상태
  const [managerSearchQuery, setManagerSearchQuery] = useState('');
  const [managerSearchResults, setManagerSearchResults] = useState<ManagerSearchResult[]>([]);
  const [managerSearching, setManagerSearching] = useState(false);
  const [managerAssigning, setManagerAssigning] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 폼 데이터
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    displayName: '',
    password: '',
    confirmPassword: ''
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 사용자 정보 가져오기
      const userResponse = await fetch('/api/me');
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setCurrentUser(userData.user);
      }

      const response = await fetch(`/api/admin/advertisers/${params.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError('존재하지 않는 광고주입니다.');
        } else if (response.status === 403) {
          setError('권한이 없습니다.');
        } else {
          setError('데이터 로드 중 오류가 발생했습니다.');
        }
        return;
      }

      const result = await response.json();
      setData(result.advertiser);

      // 폼 초기화
      setFormData({
        name: result.advertiser.name,
        email: result.advertiser.email,
        displayName: result.advertiser.displayName || '',
        password: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      setError('데이터 로드 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  // 데이터 로드
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 클린업: 컴포넌트 언마운트 시 타임아웃 정리
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);


  // 매니저 검색
  const searchManagers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setManagerSearchResults([]);
      return;
    }

    try {
      setManagerSearching(true);
      const response = await fetch(`/api/admin/managers?q=${encodeURIComponent(query)}&limit=10`);
      if (!response.ok) {
        console.error('매니저 검색 실패');
        return;
      }

      const result = await response.json();
      setManagerSearchResults(result.managers || []);
    } catch (error) {
      console.error('매니저 검색 오류:', error);
      setManagerSearchResults([]);
    } finally {
      setManagerSearching(false);
    }
  }, []);

  // 매니저 할당
  const assignManager = async (managerId: string) => {
    if (!data) return;

    try {
      setManagerAssigning(managerId);
      const response = await fetch(`/api/admin/advertisers/${params.id}/assign-manager`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerId })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || '매니저 할당 중 오류가 발생했습니다.');
        return;
      }

      alert('매니저가 성공적으로 할당되었습니다.');
      setManagerSearchQuery('');
      setManagerSearchResults([]);
      loadData(); // 데이터 새로고침
    } catch (error) {
      console.error('매니저 할당 실패:', error);
      alert('매니저 할당 중 오류가 발생했습니다.');
    } finally {
      setManagerAssigning(null);
    }
  };

  // 매니저 할당 해제
  const unassignManager = async (managerId: string) => {
    if (!data) return;

    if (!confirm('정말로 이 매니저의 할당을 해제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/advertisers/${params.id}/assign-manager?managerId=${managerId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || '매니저 할당 해제 중 오류가 발생했습니다.');
        return;
      }

      alert('매니저 할당이 성공적으로 해제되었습니다.');
      loadData(); // 데이터 새로고침
    } catch (error) {
      console.error('매니저 할당 해제 실패:', error);
      alert('매니저 할당 해제 중 오류가 발생했습니다.');
    }
  };

  // 폼 입력 핸들러
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null); // 입력 시 에러 초기화
  };

  // 매니저 검색 입력 핸들러
  const handleManagerSearchChange = useCallback((value: string) => {
    setManagerSearchQuery(value);

    // 이전 타임아웃 취소
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // 디바운싱을 위한 검색 호출
    if (value.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        searchManagers(value);
      }, 300);
    } else {
      setManagerSearchResults([]);
    }
  }, [searchManagers]);

  // 정보 수정
  const handleUpdate = async () => {
    if (!data) return;

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

    // 비밀번호 변경 시 확인
    if (formData.password) {
      if (formData.password.length < 8) {
        setError('비밀번호는 8자 이상이어야 합니다.');
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('비밀번호가 일치하지 않습니다.');
        return;
      }
    }

    try {
      setSaving(true);

      const updateData: any = {
        name: formData.name.trim(),
        email: formData.email.trim()
      };

      if (formData.displayName.trim()) {
        updateData.displayName = formData.displayName.trim();
      }

      if (formData.password) {
        updateData.password = formData.password;
      }

      const response = await fetch(`/api/admin/advertisers/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const error = await response.json();
        setError(error.error || '수정 중 오류가 발생했습니다.');
        return;
      }

      alert('광고주 정보가 성공적으로 수정되었습니다.');
      loadData(); // 데이터 새로고침

      // 비밀번호 필드 초기화
      setFormData(prev => ({
        ...prev,
        password: '',
        confirmPassword: ''
      }));
    } catch (error) {
      console.error('수정 실패:', error);
      setError('수정 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 광고주 삭제
  const handleDelete = async () => {
    if (!data) return;

    if (!confirm('정말로 이 광고주를 삭제하시겠습니까?\n삭제된 광고주는 복구할 수 없습니다.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/advertisers/${params.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || '삭제 중 오류가 발생했습니다.');
        return;
      }

      alert('광고주가 성공적으로 삭제되었습니다.');
      router.push('/admin/advertisers');
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
            title="광고주 상세"
            description="광고주 정보를 조회하고 수정합니다."
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
            title="광고주 상세"
            description="광고주 정보를 조회하고 수정합니다."
          />
        }
      >
        <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
          <div className="text-lg text-red-500">{error || '데이터를 불러올 수 없습니다.'}</div>
          <ButtonLink href="/admin/advertisers" variant="secondary">
            목록
          </ButtonLink>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      header={
        <AdminHeader
          title="광고주 상세"
          description="광고주 정보를 조회하고 수정합니다."
        />
      }
    >
      <div className="space-y-6">
        {/* 기본 정보 수정 */}
        <Card>
          <CardBody className="space-y-6">
            <div className="text-sm font-semibold text-zinc-50">
              기본 정보 {currentUser && isManager(currentUser) ? '(읽기 전용)' : '수정'}
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
                  placeholder="광고주 이름"
                  disabled={currentUser && isManager(currentUser)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">표시 이름</Label>
                <Input
                  id="displayName"
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  placeholder="웹사이트에 표시될 이름"
                  disabled={currentUser && isManager(currentUser)}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="email">이메일 *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="advertiser@example.com"
                  disabled={currentUser && isManager(currentUser)}
                />
              </div>
            </div>

            <div className="text-xs text-zinc-400">
              등록일: {formatDateTime(data.createdAt)}
            </div>
          </CardBody>
        </Card>

        {/* 비밀번호 변경 - 매니저 숨김 */}
        {!(currentUser && isManager(currentUser)) && (
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
        )}

        {/* 통계 정보 */}
        <Card>
          <CardBody className="space-y-4">
            <div className="text-sm font-semibold text-zinc-50">
              통계 정보
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-400">
                  {formatNumber(data.stats.placesCount)}
                </div>
                <div className="text-xs text-zinc-400">등록된 장소</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-400">
                  {formatNumber(data.stats.campaignsCount)}
                </div>
                <div className="text-xs text-zinc-400">진행 중인 캠페인</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-400">
                  {formatNumber(data.stats.managersCount)}
                </div>
                <div className="text-xs text-zinc-400">할당된 매니저</div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 할당된 매니저 관리 - 매니저 숨김 */}
        {!(currentUser && isManager(currentUser)) && (
          <Card>
            <CardBody className="space-y-6">
              <div className="text-sm font-semibold text-zinc-50">
                할당된 매니저 ({formatNumber(data.managers.length)}명)
              </div>

              {/* 매니저 검색 및 추가 */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="managerSearch">매니저 검색 및 추가</Label>
                  <Input
                    id="managerSearch"
                    type="text"
                    placeholder="매니저 이름 또는 이메일로 검색..."
                    value={managerSearchQuery || ''}
                    onChange={(e) => handleManagerSearchChange(e.target.value)}
                  />
                </div>

                {/* 검색 결과 */}
                {managerSearchQuery && (
                  <div className="rounded-lg border border-white/10 bg-white/[0.02] max-h-60 overflow-y-auto">
                    {managerSearching ? (
                      <div className="px-4 py-3 text-sm text-zinc-400">검색 중...</div>
                    ) : managerSearchResults.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-zinc-400">검색 결과가 없습니다.</div>
                    ) : (
                      <div className="divide-y divide-white/10">
                        {managerSearchResults.map((manager) => {
                          const isAlreadyAssigned = data.managers.some(m => m.id === manager.id);
                          const isAssigning = managerAssigning === manager.id;
                          return (
                            <div key={manager.id} className="px-4 py-3 flex items-center justify-between">
                              <div className="flex-1">
                                <div className="text-sm font-medium text-zinc-50">{manager.name}</div>
                                <div className="text-xs text-zinc-400">{manager.email}</div>
                                <div className="text-xs text-zinc-500">
                                  할당된 광고주: {formatNumber(manager._count.managedAdvertisers)}개
                                </div>
                              </div>
                              <Button
                                onClick={() => assignManager(manager.id)}
                                disabled={isAlreadyAssigned || isAssigning}
                                variant={isAlreadyAssigned ? "secondary" : "primary"}
                                size="sm"
                              >
                                {isAssigning ? '할당 중...' : isAlreadyAssigned ? '이미 할당됨' : '할당'}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 할당된 매니저 목록 */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
                <DividerList>
                  {data.managers.length === 0 ? (
                    <EmptyState title="할당된 매니저가 없습니다." />
                  ) : (
                    data.managers.map((manager) => (
                      <div key={manager.id} className="px-6 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-semibold text-zinc-50">
                                {manager.name}
                              </div>
                              <Pill tone="indigo">
                                매니저
                              </Pill>
                            </div>
                            <div className="text-xs text-zinc-400">
                              {manager.email}
                            </div>
                            <div className="text-xs text-zinc-500">
                              배정자: {manager.assignedBy} · 배정일: {formatDateTime(manager.assignedAt)}
                            </div>
                          </div>
                          <Button
                            onClick={() => unassignManager(manager.id)}
                            variant="danger"
                            size="sm"
                          >
                            해제
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </DividerList>
              </div>
            </CardBody>
          </Card>
        )}

        {/* 장소 목록 */}
        <Card>
          <CardBody className="space-y-4">
            <div className="text-sm font-semibold text-zinc-50">
              등록된 장소 ({formatNumber(data.places.length)}개)
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
              <DividerList>
                {data.places.length === 0 ? (
                  <EmptyState title="등록된 장소가 없습니다." />
                ) : (
                  data.places.slice(0, 5).map((place) => (
                    <div key={place.id} className="px-6 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-zinc-50">
                              {place.name}
                            </div>
                            <Pill tone="emerald">
                              장소
                            </Pill>
                          </div>
                          <div className="text-xs text-zinc-400">
                            {place.address}
                          </div>
                          <div className="text-xs text-zinc-500">
                            캠페인: {formatNumber(place.campaigns.length)}개
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {data.places.length > 5 && (
                  <div className="px-6 py-4 text-center text-xs text-zinc-500">
                    외 {formatNumber(data.places.length - 5)}개 장소
                  </div>
                )}
              </DividerList>
            </div>
          </CardBody>
        </Card>

        {/* 최근 예산 변동 내역 */}
        <Card>
          <CardBody className="space-y-4">
            <div className="text-sm font-semibold text-zinc-50">
              최근 예산 변동 내역
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
              <DividerList>
                {data.recentBudgetLedgers.length === 0 ? (
                  <EmptyState title="예산 변동 내역이 없습니다." />
                ) : (
                  data.recentBudgetLedgers.map((ledger) => (
                    <div key={ledger.id} className="px-6 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-zinc-50">
                            {ledger.reason}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {formatDateTime(ledger.createdAt)}
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-cyan-400">
                          {formatCurrency(ledger.amountKrw)}
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
          {!(currentUser && isManager(currentUser)) && (
            <>
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
                광고주 삭제
              </Button>
            </>
          )}

          <ButtonLink href="/admin/advertisers" variant="secondary">
            목록
          </ButtonLink>
        </div>
      </div>
    </PageShell>
  );
}
