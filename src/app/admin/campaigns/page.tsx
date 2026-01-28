'use client';

import { useEffect, useState } from 'react';
import { PageShell } from "@/app/_ui/shell";
import { AdminHeader } from "../_components/AdminHeader";
import { ButtonLink, Card, CardBody, DividerList, EmptyState, Pill } from "@/app/_ui/primitives";
import { getCampaignStatusLabel } from "@/lib/status-labels";

interface Campaign {
  id: string;
  missionType: string;
  place: {
    name: string;
  };
  productOrders: Array<{
    product: {
      name: string;
      missionType: string;
    };
  }>;
  advertiser: {
    user: { name: string | null };
  };
  status: string;
  startDate: string;
  endDate: string;
  dailyTarget: number;
  createdAt: string;
  _count: {
    missionDays: number;
  };
}

export default function AdminCampaignsPage() {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/campaigns/list');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '캠페인 목록을 불러올 수 없습니다.');
      }

      const data = await response.json();
      setCampaigns(data.campaigns || []);
    } catch (error) {
      console.error('캠페인 로드 실패:', error);
      setError(error instanceof Error ? error.message : '캠페인을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(dateStr));
  };

  const formatNumber = (n: number): string => {
    return new Intl.NumberFormat("ko-KR").format(n);
  };

  if (loading) {
    return (
      <PageShell
        header={
          <AdminHeader
            title="캠페인 관리"
            description="활성 캠페인을 조회하고 관리합니다."
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
            description="활성 캠페인을 조회하고 관리합니다."
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
          description="활성 캠페인을 조회하고 관리합니다."
        />
      }
    >
      <div className="space-y-6">
        <Card>
          <CardBody className="space-y-4">
            <div className="text-sm font-semibold text-zinc-50">
              캠페인 목록 ({formatNumber(campaigns.length)}개)
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
              <DividerList>
                {campaigns.length === 0 ? (
                  <EmptyState title="등록된 캠페인이 없습니다." />
                ) : (
                  campaigns.map((campaign) => (
                    <div key={campaign.id} className="px-6 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-zinc-50">
                              {campaign.place.name}
                            </div>
                            <Pill tone={
                              campaign.status === "ACTIVE" ? "emerald" :
                              campaign.status === "DRAFT" ? "neutral" :
                              campaign.status === "PAUSED" ? "red" :
                              campaign.status === "ENDED" ? "neutral" : "neutral"
                            }>
                              {getCampaignStatusLabel(campaign.status)}
                            </Pill>
                          </div>
                            <div className="text-xs text-zinc-400">
                              광고주: {campaign.advertiser.user.name} · 상품: {campaign.productOrders[0]?.product.name || '상품 정보 없음'}
                            </div>
                            <div className="text-xs text-zinc-500">
                              미션 유형: {campaign.productOrders[0]?.product.missionType || campaign.missionType} · 일일 목표: {formatNumber(campaign.dailyTarget)}명
                            </div>
                            <div className="text-xs text-zinc-500">
                              기간: {formatDate(campaign.startDate)} ~ {formatDate(campaign.endDate)}
                            </div>
                            <div className="text-xs text-zinc-500">
                              미션 일수: {formatNumber(campaign._count.missionDays)}일 · 생성일: {formatDate(campaign.createdAt)}
                            </div>
                        </div>
                        <div className="flex gap-2">
                          <ButtonLink href={`/admin/campaigns/${campaign.id}`} variant="secondary" size="sm">
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
      </div>
    </PageShell>
  );
}
