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
  Button
} from "@/app/_ui/primitives";
import { AdminHeader } from "../_components/AdminHeader";

function formatNumber(n: number): string {
  return new Intl.NumberFormat("ko-KR").format(n);
}

function formatKrw(n: number): string {
  return `${formatNumber(n)}원`;
}

function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(d);
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit"
  }).format(d);
}

interface Campaign {
  id: string;
  title: string;
  status: string;
  targetTeamCount: number;
  maxMembersPerTeam: number;
  applicationDeadline: string | Date;
  startDate: string | Date;
  endDate: string | Date;
  createdAt: string | Date;
  advertiser: {
    user: { name: string | null };
  };
  place: { name: string };
  _count: {
    teams: number;
  };
}

interface ManagedAdvertiser {
  advertiserId: string;
  advertiser: {
    user: { name: string | null };
  };
}

interface User {
  id: string;
  role: string;
  adminType?: string;
  email?: string | null;
}

export default function CampaignsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const advertiserId = searchParams?.get('advertiserId') || undefined;

  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [managedAdvertisers, setManagedAdvertisers] = useState<ManagedAdvertiser[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isManager = user?.adminType === "MANAGER";

  // 데이터 로드
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
        const errorData = await userResponse.json().catch(() => ({}));
        throw new Error(errorData.error || '사용자 정보를 불러올 수 없습니다.');
      }
      const userData = await userResponse.json();
      const currentUser = userData.user;
      setUser(currentUser);

      const isManager = currentUser?.adminType === "MANAGER";

      // 매니저인 경우 담당 광고주 목록 조회
      let managedAdvertisersData: ManagedAdvertiser[] = [];
      let allowedAdvertiserIds: string[] = [];

      if (isManager && currentUser) {
        const advertisersResponse = await fetch('/api/admin/managers/assigned-advertisers');
        if (advertisersResponse.ok) {
          const responseData = await advertisersResponse.json();
          managedAdvertisersData = responseData.advertisers || [];
          setManagedAdvertisers(managedAdvertisersData);
          allowedAdvertiserIds = managedAdvertisersData.map(am => am.advertiserId);
        } else {
          const errorData = await advertisersResponse.json().catch(() => ({}));
          console.warn('담당 광고주 조회 실패:', errorData.error);
        }
      }

      // 쿼리 조건 설정
      const whereCondition: any = {};
      if (isManager) {
        // 매니저는 담당 광고주만 조회
        if (advertiserId && allowedAdvertiserIds.includes(advertiserId)) {
          whereCondition.advertiserId = advertiserId;
        } else if (allowedAdvertiserIds.length > 0) {
          whereCondition.advertiserId = { in: allowedAdvertiserIds };
        } else {
          // 담당 광고주가 없는 경우 빈 결과 반환
          setCampaigns([]);
          return;
        }
      } else if (advertiserId) {
        // 슈퍼관리자는 특정 광고주 필터링 가능
        whereCondition.advertiserId = advertiserId;
      }

      // 캠페인 목록 조회
      const campaignsResponse = await fetch('/api/admin/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ where: whereCondition })
      });

      if (!campaignsResponse.ok) {
        const errorData = await campaignsResponse.json().catch(() => ({}));
        throw new Error(errorData.error || '캠페인 목록을 불러올 수 없습니다.');
      }

      const campaignsData = await campaignsResponse.json();
      setCampaigns(campaignsData || []);

    } catch (error) {
      console.error('데이터 로드 실패:', error);
      setError(error instanceof Error ? error.message : '데이터를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageShell
        header={
          <AdminHeader
            title="캠페인 관리"
            description="광고주의 미션 캠페인을 관리합니다."
          />
        }
      >
        <div className="flex items-center justify-center min-h-96">
          <div className="text-lg">로딩 중...</div>
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell
        header={
          <AdminHeader
            title="캠페인 관리"
            description="광고주의 미션 캠페인을 관리합니다."
          />
        }
      >
        <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
          <div className="text-lg text-red-500">{error}</div>
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
          title="캠페인 관리"
          description={isManager ? "담당 광고주의 미션 캠페인을 관리합니다." : "광고주의 미션 캠페인을 관리합니다."}
        />
      }
    >
      <div className="space-y-6">
        {/* 등록 버튼 - 필요시 추가 */}
        {/* <div className="flex justify-end">
          <ButtonLink href="/admin/campaigns/new" variant="primary" size="sm">
            새 캠페인 생성
          </ButtonLink>
        </div> */}

        {/* 캠페인 목록 */}
        <Card>
          <CardBody className="space-y-4">
            <div className="text-sm font-semibold text-zinc-50">
              캠페인 목록 ({formatNumber(campaigns.length)}개)
            </div>

            {/* 매니저 필터링 */}
            {isManager && managedAdvertisers.length > 0 && (
              <div className="flex items-center gap-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                <span className="text-sm text-zinc-300">광고주 필터:</span>
                <select
                  value={advertiserId || ""}
                  onChange={(e) => {
                    const newAdvertiserId = e.target.value;
                    const params = new URLSearchParams();
                    if (newAdvertiserId) {
                      params.set('advertiserId', newAdvertiserId);
                    }
                    router.push(`/admin/campaigns?${params.toString()}`);
                  }}
                  className="px-3 py-2 text-sm bg-zinc-700 border border-zinc-600 rounded-md text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">전체 담당 광고주</option>
                  {managedAdvertisers.map((am) => (
                    <option key={am.advertiserId} value={am.advertiserId}>
                      {am.advertiser.user.name}
                    </option>
                  ))}
                </select>
                {advertiserId && (
                  <Button
                    onClick={() => {
                      router.push('/admin/campaigns');
                    }}
                    variant="secondary"
                    size="sm"
                  >
                    필터 해제
                  </Button>
                )}
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
              <DividerList>
                {campaigns.length === 0 ? (
                  <EmptyState title="생성된 캠페인이 없습니다." />
                ) : (
                  campaigns.map((campaign) => (
                    <div key={campaign.id} className="px-6 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-zinc-50">
                              {campaign.title}
                            </div>
                            <Pill tone={
                              campaign.status === "ACTIVE" ? "emerald" :
                              campaign.status === "DRAFT" ? "cyan" :
                              campaign.status === "PAUSED" ? "neutral" : "neutral"
                            }>
                              {campaign.status === "ACTIVE" ? "활성" :
                               campaign.status === "DRAFT" ? "초안" :
                               campaign.status === "PAUSED" ? "일시정지" : "종료"}
                            </Pill>
                            {/* 미션 타입 표시 생략 */}
                          </div>
                          <div className="text-xs text-zinc-400">
                            광고주: {campaign.advertiser.user.name} · 장소: {campaign.place.name}
                          </div>
                          <div className="text-xs text-zinc-500">
                            목표 팀 수: {formatNumber(campaign.targetTeamCount)}팀 · 팀당 최대 인원: {formatNumber(campaign.maxMembersPerTeam)}명
                          </div>
                          <div className="text-xs text-zinc-500">
                            신청 마감: {formatDateTime(new Date(campaign.applicationDeadline))} · 체험 기간: {formatDate(new Date(campaign.startDate))} ~ {formatDate(new Date(campaign.endDate))}
                          </div>
                          <div className="text-xs text-zinc-500">
                            참여 팀: {formatNumber(campaign._count.teams)}팀 · 생성: {formatDateTime(new Date(campaign.createdAt))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <ButtonLink href={`/admin/campaigns/${campaign.id}`} variant="secondary" size="sm">
                            상세
                          </ButtonLink>
                          <ButtonLink href={`/admin/reviews?campaignId=${campaign.id}`} variant="secondary" size="sm">
                            검수 대기
                          </ButtonLink>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </DividerList>
            </div>
          </CardBody>
        </Card>
      </div>
    </PageShell>
  );
}
