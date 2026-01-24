'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageShell } from "@/app/_ui/shell";
import {
  ButtonLink,
  Card,
  CardBody,
  DividerList,
  EmptyState,
  Pill,
  Button,
  TextInput,
  TextArea,
  Select
} from "@/app/_ui/primitives";
import { AdminHeader } from "@/app/admin/_components/AdminHeader";

interface ExperienceCampaign {
  id: string;
  title: string;
  missionGuide: string;
  benefits: string;
  status: string;
  targetTeamCount: number;
  maxMembersPerTeam: number;
  applicationDeadline: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  advertiser: {
    user: { name: string | null; email: string };
  };
  place: {
    name: string;
  };
  manager: {
    name: string;
    email: string;
  };
  application: {
    pricingPlan: {
      displayName: string;
      priceKrw: number;
    };
  };
  teams: Array<{
    id: string;
    status: string;
    memberships: Array<{
      member: {
        user: { name: string | null };
      };
    }>;
  }>;
  _count: {
    teams: number;
  };
}

interface TeamApplication {
  id: string;
  teamName: string;
  status: string;
  leader: {
    id: string;
    name: string;
    email: string;
  };
  totalMemberCount: number;
  approvedMembers: Array<{
    id: string;
    name: string;
    decidedBy: string | null;
    decidedAt: string | null;
  }>;
  pendingMembers: Array<{
    id: string;
    name: string;
  }>;
  rejectedMembers: Array<{
    id: string;
    name: string;
    decidedBy: string | null;
    decidedAt: string | null;
    failureReason: string | null;
  }>;
  appliedAt: string;
  updatedAt: string;
  description: string | null;
}

interface User {
  id: string;
  role: string;
  adminType?: string;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("ko-KR").format(n);
}

function formatDateTime(d: string | Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(d));
}

function formatDate(d: string | Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(d));
}

export default function CampaignDetailPage(props: {
  params: { id: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams?.get('tab') === 'team-applications' ? 'team-applications' : 'overview';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [campaign, setCampaign] = useState<ExperienceCampaign | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 수정 모드 상태
  const [isEditing, setIsEditing] = useState(false);

  // 팀 신청 관리 상태
  const [activeTab, setActiveTab] = useState<'overview' | 'team-applications'>(initialTab);
  const [teamApplications, setTeamApplications] = useState<TeamApplication[]>([]);
  const [teamApplicationsLoading, setTeamApplicationsLoading] = useState(false);
  const [processingApplication, setProcessingApplication] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    missionGuide: '',
    benefits: '',
    targetTeamCount: 1,
    maxMembersPerTeam: 5,
    applicationDeadline: '',
    startDate: '',
    endDate: '',
    status: ''
  });


  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 현재 사용자 정보 가져오기
      const userResponse = await fetch('/api/admin/me');
      if (!userResponse.ok) {
        throw new Error('사용자 정보를 불러올 수 없습니다.');
      }
      const userData = await userResponse.json();
      setUser(userData.user);

      // 공고 상세 정보 가져오기
      const campaignResponse = await fetch(`/api/admin/experience-campaigns/${props.params.id}`);
      if (!campaignResponse.ok) {
        const errorData = await campaignResponse.json().catch(() => ({}));
        throw new Error(errorData.error || '공고 정보를 불러올 수 없습니다.');
      }
      const campaignData = await campaignResponse.json();
      setCampaign(campaignData.campaign);

      // 수정 폼 데이터 초기화
      setEditFormData({
        title: campaignData.campaign.title,
        missionGuide: campaignData.campaign.missionGuide,
        benefits: campaignData.campaign.benefits,
        targetTeamCount: campaignData.campaign.targetTeamCount,
        maxMembersPerTeam: campaignData.campaign.maxMembersPerTeam,
        applicationDeadline: new Date(campaignData.campaign.applicationDeadline).toISOString().slice(0, 16),
        startDate: new Date(campaignData.campaign.startDate).toISOString().slice(0, 16),
        endDate: new Date(campaignData.campaign.endDate).toISOString().slice(0, 16),
        status: campaignData.campaign.status
      });

      // 팀 신청 목록 로드
      await loadTeamApplications();

    } catch (error) {
      console.error('데이터 로드 실패:', error);
      setError(error instanceof Error ? error.message : '데이터를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!campaign) return;

    // 클라이언트 사이드 검증
    const errors: string[] = [];

    if (!editFormData.title.trim()) {
      errors.push('공고 제목을 입력해주세요.');
    }

    if (!editFormData.missionGuide.trim()) {
      errors.push('미션 가이드를 입력해주세요.');
    }

    if (!editFormData.benefits.trim()) {
      errors.push('제공 내역을 입력해주세요.');
    }

    // 날짜 검증
    if (editFormData.applicationDeadline && editFormData.startDate) {
      const deadline = new Date(editFormData.applicationDeadline);
      const start = new Date(editFormData.startDate);
      if (deadline >= start) {
        errors.push('신청 마감일은 체험 시작일보다 빨라야 합니다.');
      }
    }

    if (editFormData.startDate && editFormData.endDate) {
      const start = new Date(editFormData.startDate);
      const end = new Date(editFormData.endDate);
      if (start >= end) {
        errors.push('체험 종료일은 시작일보다 늦어야 합니다.');
      }
    }

    if (errors.length > 0) {
      setError(errors.join(' '));
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/admin/experience-campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editFormData.title,
          missionGuide: editFormData.missionGuide,
          benefits: editFormData.benefits,
          targetTeamCount: editFormData.targetTeamCount,
          maxMembersPerTeam: editFormData.maxMembersPerTeam,
          applicationDeadline: new Date(editFormData.applicationDeadline),
          startDate: new Date(editFormData.startDate),
          endDate: new Date(editFormData.endDate),
          status: editFormData.status
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '공고 수정에 실패했습니다.');
      }

      const result = await response.json();
      setCampaign(result.campaign);
      setIsEditing(false);

      // 수정 폼 데이터 업데이트
      setEditFormData({
        title: result.campaign.title,
        missionGuide: result.campaign.missionGuide,
        benefits: result.campaign.benefits,
        targetTeamCount: result.campaign.targetTeamCount,
        maxMembersPerTeam: result.campaign.maxMembersPerTeam,
        applicationDeadline: new Date(result.campaign.applicationDeadline).toISOString().slice(0, 16),
        startDate: new Date(result.campaign.startDate).toISOString().slice(0, 16),
        endDate: new Date(result.campaign.endDate).toISOString().slice(0, 16),
        status: result.campaign.status
      });

    } catch (error) {
      console.error('공고 수정 실패:', error);
      setError(error instanceof Error ? error.message : '공고 수정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!campaign) return;

    try {
      setDeleting(true);
      setError(null);

      const response = await fetch(`/api/admin/experience-campaigns/${campaign.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '공고 삭제에 실패했습니다.');
      }

      // 삭제 성공 시 공고 관리 페이지로 이동
      router.push('/admin/experience?tab=campaigns');

    } catch (error) {
      console.error('공고 삭제 실패:', error);
      setError(error instanceof Error ? error.message : '공고 삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  const loadTeamApplications = async () => {
    try {
      setTeamApplicationsLoading(true);
      const response = await fetch(`/api/admin/experience-campaigns/${props.params.id}/team-applications`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '팀 신청 목록을 불러올 수 없습니다.');
      }
      const data = await response.json();
      setTeamApplications(data.applications || []);
    } catch (error) {
      console.error('팀 신청 목록 로드 실패:', error);
      // 에러가 발생해도 UI가 깨지지 않도록 빈 배열로 설정
      setTeamApplications([]);
    } finally {
      setTeamApplicationsLoading(false);
    }
  };

  const handleApproveTeam = async (application: TeamApplication) => {
    if (!window.confirm(`"${application.teamName}" 팀의 신청을 승인하시겠습니까?`)) {
      return;
    }

    try {
      setProcessingApplication(application.id);
      setError(null);

      const response = await fetch(`/api/admin/experience-campaigns/${props.params.id}/approve-team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: application.id,
          teamName: application.teamName,
          teamDescription: application.description
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '팀 신청 승인에 실패했습니다.');
      }

      // 성공 시 목록 새로고침
      await loadTeamApplications();

      // 공고 정보도 새로고침 (팀 수 업데이트를 위해)
      const campaignResponse = await fetch(`/api/admin/experience-campaigns/${props.params.id}`);
      if (campaignResponse.ok) {
        const campaignData = await campaignResponse.json();
        setCampaign(campaignData.campaign);
      }

    } catch (error) {
      console.error('팀 신청 승인 실패:', error);
      setError(error instanceof Error ? error.message : '팀 신청 승인에 실패했습니다.');
    } finally {
      setProcessingApplication(null);
    }
  };

  const handleRejectTeam = async (application: TeamApplication) => {
    const reason = window.prompt(`"${application.teamName}" 팀의 신청을 거절하는 이유를 입력해주세요 (선택사항):`);
    if (reason === null) return; // 취소됨

    try {
      setProcessingApplication(application.id);
      setError(null);

      const response = await fetch(`/api/admin/experience-campaigns/${props.params.id}/reject-team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: application.id,
          reason: reason.trim() || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '팀 신청 거절에 실패했습니다.');
      }

      // 성공 시 목록 새로고침
      await loadTeamApplications();

    } catch (error) {
      console.error('팀 신청 거절 실패:', error);
      setError(error instanceof Error ? error.message : '팀 신청 거절에 실패했습니다.');
    } finally {
      setProcessingApplication(null);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <PageShell
        header={
          <AdminHeader
            title="공고 상세"
            description="체험단 공고 정보를 조회하고 관리합니다."
          />
        }
      >
        <div className="flex items-center justify-center min-h-96">
          <div className="text-lg">로딩 중...</div>
        </div>
      </PageShell>
    );
  }

  if (error && !campaign) {
    return (
      <PageShell
        header={
          <AdminHeader
            title="공고 상세"
            description="체험단 공고 정보를 조회하고 관리합니다."
          />
        }
      >
        <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
          <div className="text-lg text-red-500">{error}</div>
          <ButtonLink href="/admin/experience?tab=campaigns" variant="secondary">
            공고 관리로 돌아가기
          </ButtonLink>
        </div>
      </PageShell>
    );
  }

  if (!campaign) {
    return (
      <PageShell
        header={
          <AdminHeader
            title="공고 상세"
            description="체험단 공고 정보를 조회하고 관리합니다."
          />
        }
      >
        <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
          <div className="text-lg text-red-500">공고 정보를 찾을 수 없습니다.</div>
          <ButtonLink href="/admin/experience?tab=campaigns" variant="secondary">
            공고 관리로 돌아가기
          </ButtonLink>
        </div>
      </PageShell>
    );
  }

  const activeTeams = campaign.teams.filter(t => t.status === 'ACTIVE');
  const totalMembers = campaign.teams.reduce((sum, team) =>
    sum + team.memberships.length, 0
  );

  return (
    <PageShell
      header={
        <AdminHeader
          title={campaign.title}
          description="체험단 공고 정보를 조회하고 관리합니다."
        />
      }
    >
      <div className="space-y-6">
        {/* 탭 */}
        <div className="border-b border-white/10">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => {
                setActiveTab('overview');
                router.replace(`/admin/experience-campaigns/${props.params.id}`);
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-600'
              }`}
            >
              공고 개요
            </button>
            <button
              onClick={() => {
                setActiveTab('team-applications');
                router.replace(`/admin/experience-campaigns/${props.params.id}?tab=team-applications`);
                loadTeamApplications();
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'team-applications'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-600'
              }`}
            >
              팀 관리 ({teamApplications.length})
            </button>
          </nav>
        </div>

        {/* 탭 컨텐츠 */}
        {activeTab === 'overview' && (
          <>
            {/* 액션 버튼 */}
            <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Pill tone={
              campaign.status === "ACTIVE" ? "emerald" :
              campaign.status === "DRAFT" ? "neutral" :
              campaign.status === "PAUSED" ? "red" : "neutral"
            }>
              {campaign.status === "ACTIVE" ? "진행중" :
               campaign.status === "DRAFT" ? "초안" :
               campaign.status === "PAUSED" ? "일시중지" : campaign.status}
            </Pill>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsEditing(!isEditing)}
              variant="secondary"
              size="sm"
            >
              {isEditing ? '수정 취소' : '수정'}
            </Button>
                            <Button
                              onClick={() => {
                                // 참여 중인 팀이 있는지 확인
                                if (campaign.teams.length > 0) {
                                  alert('참여 중인 팀이 있는 공고는 삭제할 수 없습니다.');
                                  return;
                                }

                                if (window.confirm('정말로 이 공고를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                                  handleDelete();
                                }
                              }}
                              variant="danger"
                              size="sm"
                              disabled={campaign.teams.length > 0}
                            >
                              삭제
                            </Button>
            <ButtonLink href="/admin/experience?tab=campaigns" variant="secondary" size="sm">
              목록
            </ButtonLink>
          </div>
        </div>

        {/* 공고 기본 정보 */}
        <Card>
          <CardBody className="space-y-6">
            <div className="text-sm font-semibold text-zinc-50">
              공고 정보
            </div>

            {!isEditing ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="text-sm">
                  <span className="text-zinc-400">광고주:</span> {campaign.advertiser.user.name}
                </div>
                <div className="text-sm">
                  <span className="text-zinc-400">장소:</span> {campaign.place.name}
                </div>
                <div className="text-sm">
                  <span className="text-zinc-400">요금제:</span> {campaign.application.pricingPlan.displayName} ({formatNumber(campaign.application.pricingPlan.priceKrw)}원)
                </div>
                <div className="text-sm">
                  <span className="text-zinc-400">담당 매니저:</span> {campaign.manager.name}
                </div>
                <div className="text-sm">
                  <span className="text-zinc-400">목표 팀 수:</span> {campaign.targetTeamCount}팀
                </div>
                <div className="text-sm">
                  <span className="text-zinc-400">팀당 최대 인원:</span> {campaign.maxMembersPerTeam}명
                </div>
                <div className="text-sm">
                  <span className="text-zinc-400">신청 마감일:</span> {formatDateTime(campaign.applicationDeadline)}
                </div>
                <div className="text-sm">
                  <span className="text-zinc-400">체험 기간:</span> {formatDate(campaign.startDate)} ~ {formatDate(campaign.endDate)}
                </div>
                <div className="text-sm">
                  <span className="text-zinc-400">생성일:</span> {formatDateTime(campaign.createdAt)}
                </div>
                <div className="text-sm">
                  <span className="text-zinc-400">최종 수정일:</span> {formatDateTime(campaign.updatedAt)}
                </div>
              </div>
            ) : (
              <form onSubmit={handleEditSubmit}>
                <div className="space-y-4">
                  <TextInput
                    label="공고 제목"
                    value={editFormData.title}
                    onChange={(value) => handleInputChange('title', value)}
                    required
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextInput
                      label="목표 팀 수"
                      type="number"
                      value={editFormData.targetTeamCount.toString()}
                      onChange={(value) => handleInputChange('targetTeamCount', parseInt(value) || 1)}
                      min="1"
                      required
                    />

                    <TextInput
                      label="팀당 최대 인원"
                      type="number"
                      value={editFormData.maxMembersPerTeam.toString()}
                      onChange={(value) => handleInputChange('maxMembersPerTeam', parseInt(value) || 1)}
                      min="1"
                      required
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <TextInput
                      label="신청 마감일"
                      type="datetime-local"
                      value={editFormData.applicationDeadline}
                      onChange={(value) => handleInputChange('applicationDeadline', value)}
                      required
                    />

                    <TextInput
                      label="체험 시작일"
                      type="datetime-local"
                      value={editFormData.startDate}
                      onChange={(value) => handleInputChange('startDate', value)}
                      required
                    />

                    <TextInput
                      label="체험 종료일"
                      type="datetime-local"
                      value={editFormData.endDate}
                      onChange={(value) => handleInputChange('endDate', value)}
                      required
                    />
                  </div>

                  <Select
                    value={editFormData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    required
                  >
                    <option value="DRAFT">초안</option>
                    <option value="ACTIVE">진행중</option>
                    <option value="PAUSED">일시중지</option>
                    <option value="ENDED">마감</option>
                  </Select>

                  <div className="pt-4 border-t border-white/10 space-y-3">
                    {error && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <div className="text-sm text-red-400">{error}</div>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <Button
                        type="submit"
                        disabled={saving}
                        className="flex-1"
                      >
                        {saving ? '저장 중...' : '저장'}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        variant="secondary"
                      >
                        취소
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </CardBody>
        </Card>

        {/* 미션 가이드 및 혜택 */}
        <Card>
          <CardBody className="space-y-6">
            <div className="text-sm font-semibold text-zinc-50">
              미션 가이드 및 혜택
            </div>

            {!isEditing ? (
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-semibold text-zinc-200 mb-2">미션 가이드 (촬영 포인트)</div>
                  <div className="text-sm text-zinc-300 whitespace-pre-wrap bg-zinc-800/50 p-4 rounded-lg">
                    {campaign.missionGuide}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-zinc-200 mb-2">제공 내역</div>
                  <div className="text-sm text-zinc-300 whitespace-pre-wrap bg-zinc-800/50 p-4 rounded-lg">
                    {campaign.benefits}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <TextArea
                  label="미션 가이드 (촬영 포인트)"
                  value={editFormData.missionGuide}
                  onChange={(value) => handleInputChange('missionGuide', value)}
                  rows={6}
                  required
                />

                <TextArea
                  label="제공 내역"
                  value={editFormData.benefits}
                  onChange={(value) => handleInputChange('benefits', value)}
                  rows={4}
                  required
                />
              </div>
            )}
          </CardBody>
        </Card>

        {/* 팀 현황 */}
        <Card>
          <CardBody className="space-y-4">
            <div className="text-sm font-semibold text-zinc-50">
              팀 현황 ({campaign._count.teams}팀, 총 {totalMembers}명 참여)
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
              <DividerList>
                {campaign.teams.length === 0 ? (
                  <EmptyState title="아직 참여한 팀이 없습니다." />
                ) : (
                  campaign.teams.map((team) => (
                    <div key={team.id} className="px-6 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-zinc-50">
                              {`팀 #${team.id.slice(-6)}`}
                            </div>
                            <Pill tone={
                              team.status === "ACTIVE" ? "emerald" :
                              team.status === "FORMING" ? "cyan" :
                              team.status === "COMPLETED" ? "indigo" :
                              team.status === "CANCELLED" ? "red" : "neutral"
                            }>
                              {team.status === "ACTIVE" ? "참여중" :
                               team.status === "FORMING" ? "팀구성중" :
                               team.status === "COMPLETED" ? "완료" :
                               team.status === "CANCELLED" ? "취소" : team.status}
                            </Pill>
                          </div>
                          <div className="text-xs text-zinc-400">
                            참여자: {team.memberships.map(m =>
                              m.member.user.name || '이름없음'
                            ).join(', ')} ({team.memberships.length}명)
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
          </>
        )}

        {activeTab === 'team-applications' && (
          <Card>
            <CardBody className="space-y-4">
              <div className="text-sm font-semibold text-zinc-50">
                팀 신청 목록 ({formatNumber(teamApplications.length)}개)
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="text-sm text-red-400">{error}</div>
                </div>
              )}

              <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
                <DividerList>
                  {teamApplicationsLoading ? (
                    <div className="px-6 py-8 text-center">
                      <div className="text-sm text-zinc-400">로딩 중...</div>
                    </div>
                  ) : teamApplications.length === 0 ? (
                    <EmptyState title="등록된 팀이 없습니다." />
                  ) : (
                    teamApplications.map((application) => (
                      <div key={application.id} className="px-6 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-2 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-semibold text-zinc-50">
                                {application.teamName}
                              </div>
                              <Pill tone={
                                application.status === "PENDING_LEADER_APPROVAL" ? "cyan" :
                                application.status === "FORMING" ? "neutral" :
                                application.status === "ACTIVE" ? "emerald" :
                                application.status === "COMPLETED" ? "indigo" :
                                application.status === "CANCELLED" ? "red" : "neutral"
                              }>
                                {application.status === "PENDING_LEADER_APPROVAL" ? "승인대기" :
                                 application.status === "FORMING" ? "팀구성중" :
                                 application.status === "ACTIVE" ? "참여중" :
                                 application.status === "COMPLETED" ? "완료" :
                                 application.status === "CANCELLED" ? "취소" : application.status}
                              </Pill>
                            </div>
                            <div className="text-xs text-zinc-400">
                              신청자: {application.leader.name} ({application.leader.email})
                            </div>

                            {/* 승인된 멤버 */}
                            {application.approvedMembers.length > 0 && (
                              <div className="text-xs text-green-400">
                                승인 멤버: {application.approvedMembers.map(m => m.name).join(', ')} ({application.approvedMembers.length}명)
                              </div>
                            )}

                            {/* 승인 대기 중인 멤버 */}
                            {application.pendingMembers.length > 0 && (
                              <div className="text-xs text-yellow-400">
                                승인 대기: {application.pendingMembers.map(m => m.name).join(', ')} ({application.pendingMembers.length}명)
                              </div>
                            )}

                            {/* 거절된 멤버 */}
                            {application.rejectedMembers.length > 0 && (
                              <div className="text-xs text-red-400">
                                거절 멤버: {application.rejectedMembers.map(m => `${m.name}${m.failureReason ? `(${m.failureReason})` : ''}`).join(', ')} ({application.rejectedMembers.length}명)
                              </div>
                            )}

                            {application.description && (
                              <div className="text-xs text-zinc-500">
                                설명: {application.description}
                              </div>
                            )}
                            <div className="text-xs text-zinc-500">
                              신청일: {formatDateTime(application.appliedAt)}
                              {application.updatedAt !== application.appliedAt && (
                                <> · 수정일: {formatDateTime(application.updatedAt)}</>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {application.status === "PENDING_LEADER_APPROVAL" && (
                              <>
                                <Button
                                  onClick={() => handleApproveTeam(application)}
                                  disabled={processingApplication === application.id}
                                  variant="primary"
                                  size="sm"
                                >
                                  {processingApplication === application.id ? '처리중...' : '승인'}
                                </Button>
                                <Button
                                  onClick={() => handleRejectTeam(application)}
                                  disabled={processingApplication === application.id}
                                  variant="danger"
                                  size="sm"
                                >
                                  {processingApplication === application.id ? '처리중...' : '거절'}
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </DividerList>
              </div>
            </CardBody>
          </Card>
        )}

      </div>
    </PageShell>
  );
}
