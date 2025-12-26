'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell } from "@/app/_ui/shell";
import {
  ButtonLink,
  Card,
  CardBody,
  Button,
  TextInput,
  TextArea,
  Select
} from "@/app/_ui/primitives";
import { AdminHeader } from "../../../../_components/AdminHeader";

interface ExperienceApplication {
  id: string;
  businessName: string;
  placeType: string;
  advertiser: {
    user: { name: string | null };
  };
  pricingPlan: {
    displayName: string;
  };
}

interface Place {
  id: string;
  name: string;
}

interface User {
  id: string;
  role: string;
  adminType?: string;
}

export default function NewCampaignPage(props: {
  params: { id: string };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [application, setApplication] = useState<ExperienceApplication | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    placeId: '',
    title: '',
    missionGuide: '',
    benefits: '',
    targetTeamCount: 1,
    maxMembersPerTeam: 5,
    applicationDeadline: '',
    startDate: '',
    endDate: ''
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

      // 체험단 신청 정보 가져오기
      const appResponse = await fetch(`/api/admin/experience-applications/${props.params.id}`);
      if (!appResponse.ok) {
        throw new Error('체험단 신청 정보를 불러올 수 없습니다.');
      }
      const appData = await appResponse.json();
      setApplication(appData.application);

      // 광고주의 장소 목록 가져오기
      const placesResponse = await fetch('/api/admin/advertiser-places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ advertiserId: appData.application.advertiserId })
      });

      if (placesResponse.ok) {
        const placesData = await placesResponse.json();
        setPlaces(placesData.places || []);

        // 첫 번째 장소를 기본값으로 선택
        if (placesData.places && placesData.places.length > 0) {
          setFormData(prev => ({
            ...prev,
            placeId: placesData.places[0].id
          }));
        }
      } else {
        const placesError = await placesResponse.json().catch(() => ({ error: '장소 정보를 불러올 수 없습니다.' }));
        console.warn('장소 정보 로드 실패:', placesError.error);
        // 장소가 없어도 폼은 계속 진행할 수 있게 함
      }

      // 기본값 설정
      setFormData(prev => ({
        ...prev,
        title: `${appData.application.businessName} 체험단 모집`
      }));

    } catch (error) {
      console.error('데이터 로드 실패:', error);
      setError(error instanceof Error ? error.message : '데이터를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!application || !user) return;

    // 장소 선택 검증
    if (!formData.placeId || places.length === 0) {
      setError('장소를 선택해주세요.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch('/api/admin/experience-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: application.id,
          placeId: formData.placeId,
          title: formData.title,
          missionGuide: formData.missionGuide,
          benefits: formData.benefits,
          targetTeamCount: formData.targetTeamCount,
          maxMembersPerTeam: formData.maxMembersPerTeam,
          applicationDeadline: new Date(formData.applicationDeadline),
          startDate: new Date(formData.startDate),
          endDate: new Date(formData.endDate)
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '공고 등록에 실패했습니다.');
      }

      // 성공 시 공고 관리 페이지로 이동
      router.push('/admin/experience?tab=campaigns');

    } catch (error) {
      console.error('공고 등록 실패:', error);
      setError(error instanceof Error ? error.message : '공고 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <PageShell
        header={
          <AdminHeader
            title="공고 등록"
            description="새로운 체험단 공고를 등록합니다."
          />
        }
      >
        <div className="flex items-center justify-center min-h-96">
          <div className="text-lg">로딩 중...</div>
        </div>
      </PageShell>
    );
  }

  if (error && !application) {
    return (
      <PageShell
        header={
          <AdminHeader
            title="공고 등록"
            description="새로운 체험단 공고를 등록합니다."
          />
        }
      >
        <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
          <div className="text-lg text-red-500">{error}</div>
          <ButtonLink href="/admin/experience" variant="secondary">
            체험단 관리로 돌아가기
          </ButtonLink>
        </div>
      </PageShell>
    );
  }

  if (!application) {
    return (
      <PageShell
        header={
          <AdminHeader
            title="공고 등록"
            description="새로운 체험단 공고를 등록합니다."
          />
        }
      >
        <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
          <div className="text-lg text-red-500">체험단 신청 정보를 찾을 수 없습니다.</div>
          <ButtonLink href="/admin/experience" variant="secondary">
            체험단 관리로 돌아가기
          </ButtonLink>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      header={
        <AdminHeader
          title="공고 등록"
          description={`${application.businessName} 체험단 공고를 등록합니다.`}
        />
      }
    >
      <div className="space-y-6">
        <Card>
          <CardBody className="space-y-6">
            <div className="text-sm font-semibold text-zinc-50">
              체험단 정보
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="text-sm">
                <span className="text-zinc-400">광고주:</span> {application.advertiser.user.name}
              </div>
              <div className="text-sm">
                <span className="text-zinc-400">매장명:</span> {application.businessName}
              </div>
              <div className="text-sm">
                <span className="text-zinc-400">요금제:</span> {application.pricingPlan.displayName}
              </div>
              <div className="text-sm">
                <span className="text-zinc-400">매장 유형:</span> {application.placeType === "OPENING_SOON" ? "오픈 예정" : "운영 중"}
              </div>
            </div>
          </CardBody>
        </Card>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardBody className="space-y-6">
              <div className="text-sm font-semibold text-zinc-50">
                공고 정보
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="text-sm text-red-400">{error}</div>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-200">장소 선택</label>
                  {places.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl">
                      등록된 장소가 없습니다. 광고주가 장소를 먼저 등록해야 합니다.
                    </div>
                  ) : (
                    <Select
                      value={formData.placeId}
                      onChange={(e) => handleInputChange('placeId', e.target.value)}
                      required
                    >
                      <option value="">장소를 선택하세요</option>
                      {places.map((place) => (
                        <option key={place.id} value={place.id}>
                          {place.name}
                        </option>
                      ))}
                    </Select>
                  )}
                </div>

                <TextInput
                  label="공고 제목"
                  value={formData.title}
                  onChange={(value) => handleInputChange('title', value)}
                  placeholder="예: [신촌] 카페 A 체험단 모집"
                  required
                />

                <TextArea
                  label="미션 가이드 (촬영 포인트)"
                  value={formData.missionGuide}
                  onChange={(value) => handleInputChange('missionGuide', value)}
                  placeholder="체험단 참여자들이 따라야 할 미션과 촬영 가이드를 상세히 입력하세요."
                  rows={6}
                  required
                />

                <TextArea
                  label="제공 내역"
                  value={formData.benefits}
                  onChange={(value) => handleInputChange('benefits', value)}
                  placeholder="체험단 참여자들에게 제공되는 혜택을 입력하세요."
                  rows={4}
                  required
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <TextInput
                    label="목표 팀 수"
                    type="number"
                    value={formData.targetTeamCount.toString()}
                    onChange={(value) => handleInputChange('targetTeamCount', parseInt(value) || 1)}
                    min="1"
                    required
                  />

                  <TextInput
                    label="팀당 최대 인원"
                    type="number"
                    value={formData.maxMembersPerTeam.toString()}
                    onChange={(value) => handleInputChange('maxMembersPerTeam', parseInt(value) || 1)}
                    min="1"
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <TextInput
                    label="신청 마감일"
                    type="date"
                    value={formData.applicationDeadline}
                    onChange={(value) => handleInputChange('applicationDeadline', value)}
                    required
                  />

                  <TextInput
                    label="체험 시작일"
                    type="date"
                    value={formData.startDate}
                    onChange={(value) => handleInputChange('startDate', value)}
                    required
                  />

                  <TextInput
                    label="체험 종료일"
                    type="date"
                    value={formData.endDate}
                    onChange={(value) => handleInputChange('endDate', value)}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                <Button
                  type="submit"
                  disabled={submitting || places.length === 0}
                  className="flex-1"
                >
                  {submitting ? '등록 중...' : places.length === 0 ? '장소 등록 필요' : '공고 등록'}
                </Button>
                <ButtonLink
                  href={`/admin/experience/${application.id}`}
                  variant="secondary"
                >
                  취소
                </ButtonLink>
              </div>
            </CardBody>
          </Card>
        </form>
      </div>
    </PageShell>
  );
}
