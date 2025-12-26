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

interface ExperienceApplication {
  id: string;
  businessName: string;
  placeType: string;
  status: string;
  createdAt: string | Date;
  pricingPlan: {
    name: string;
    displayName: string;
    priceKrw: number;
  };
  advertiser: {
    user: { name: string | null };
  };
  payment?: {
    id: string;
    status: string;
    amountKrw: number;
    provider: string;
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

export default function ExperienceApplicationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Number(searchParams?.get('page')) || 1;
  const pageSize = 10; // 한 페이지에 보여줄 항목 수
  const advertiserId = searchParams?.get('advertiserId') || undefined;

  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<ExperienceApplication[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [managedAdvertisers, setManagedAdvertisers] = useState<ManagedAdvertiser[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isManager = user?.adminType === "MANAGER";
  const totalPages = Math.ceil(totalCount / pageSize);

  // 데이터 로드
  useEffect(() => {
    loadData();
  }, [page, advertiserId]);

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
          setApplications([]);
          setTotalCount(0);
          return;
        }
      } else if (advertiserId) {
        // 슈퍼관리자는 특정 광고주 필터링 가능
        whereCondition.advertiserId = advertiserId;
      }

      // 체험단 신청 목록 조회
      const applicationsResponse = await fetch('/api/admin/experience-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          where: whereCondition,
          page,
          pageSize
        })
      });

      if (!applicationsResponse.ok) {
        const errorData = await applicationsResponse.json().catch(() => ({}));
        throw new Error(errorData.error || '체험단 신청 목록을 불러올 수 없습니다.');
      }

      const applicationsData = await applicationsResponse.json();
      setApplications(applicationsData.applications || []);
      setTotalCount(applicationsData.totalCount || 0);

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
            title="체험단 관리"
            description="체험단 신청을 조회하고 관리합니다."
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
            title="체험단 관리"
            description="체험단 신청을 조회하고 관리합니다."
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
          title="체험단 관리"
          description={isManager ? "담당 광고주의 체험단 신청을 조회하고 관리합니다." : "체험단 신청을 조회하고 관리합니다."}
        />
      }
    >
      <div className="space-y-6">
        {/* 신청 목록 */}
            <Card>
              <CardBody className="space-y-4">
                <div className="text-sm font-semibold text-zinc-50">
                  체험단 신청 목록 ({formatNumber(totalCount)}개)
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
                        // 페이지는 1로 리셋
                        router.push(`/admin/experience?${params.toString()}`);
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
                          router.push('/admin/experience');
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
                {applications.length === 0 ? (
                  <EmptyState title="신청된 체험단이 없습니다." />
                ) : (
                  applications.map((application) => (
                    <div key={application.id} className="px-6 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-zinc-50">
                              {application.businessName}
                            </div>
                            <Pill tone={
                              application.status === "PAYMENT_COMPLETED" ? "emerald" :
                              application.status === "PAYMENT_INFO_COMPLETED" ? "cyan" :
                              application.status === "COMPLETED" ? "indigo" : "neutral"
                            }>
                              {application.status === "PAYMENT_COMPLETED" ? "결제완료" :
                               application.status === "PAYMENT_INFO_COMPLETED" ? "결제대기" :
                               application.status === "COMPLETED" ? "신청완료" : application.status}
                            </Pill>
                          </div>
                          <div className="text-xs text-zinc-400">
                            광고주: {application.advertiser.user.name} · 유형: {application.placeType === "OPENING_SOON" ? "오픈예정" : "운영중"}
                          </div>
                          <div className="text-xs text-zinc-500">
                            요금제: {application.pricingPlan.displayName} ({formatNumber(application.pricingPlan.priceKrw)}원)
                          </div>
                          {application.payment && (
                            <div className="text-xs text-zinc-500">
                              결제: {application.payment.provider === "TOSS" ? "토스페이먼츠" : application.payment.provider} · {application.payment.status === "PAID" ? "결제완료" : application.payment.status}
                            </div>
                          )}
                          <div className="text-xs text-zinc-500">
                            신청일: {formatDateTime(application.createdAt)}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <ButtonLink href={`/admin/experience/${application.id}`} variant="secondary" size="sm">
                            상세
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

        {/* 페이지 네비게이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-400">
              {formatNumber((page - 1) * pageSize + 1)} - {formatNumber(Math.min(page * pageSize, totalCount))} / {formatNumber(totalCount)}개
            </div>
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <Button
                  onClick={() => {
                    const params = new URLSearchParams(searchParams?.toString());
                    params.set('page', (page - 1).toString());
                    if (advertiserId) params.set('advertiserId', advertiserId);
                    router.push(`/admin/experience?${params.toString()}`);
                  }}
                  variant="secondary"
                  size="sm"
                >
                  이전
                </Button>
              ) : (
                <span className="text-sm text-zinc-600 px-3 py-1">이전</span>
              )}
              <span className="text-sm text-zinc-400 px-3">
                {page} / {totalPages}
              </span>
              {page < totalPages ? (
                <Button
                  onClick={() => {
                    const params = new URLSearchParams(searchParams?.toString());
                    params.set('page', (page + 1).toString());
                    if (advertiserId) params.set('advertiserId', advertiserId);
                    router.push(`/admin/experience?${params.toString()}`);
                  }}
                  variant="secondary"
                  size="sm"
                >
                  다음
                </Button>
              ) : (
                <span className="text-sm text-zinc-600 px-3 py-1">다음</span>
              )}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}

