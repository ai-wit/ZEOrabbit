'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PageShell } from "@/app/_ui/shell";
import { AdminHeader } from "../../_components/AdminHeader";
import { ButtonLink, Card, CardBody, Pill } from "@/app/_ui/primitives";

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
      marketingCopy: string | null;
    };
  }>;
  advertiser: {
    user: { name: string | null; email: string | null };
  };
  status: string;
  startDate: string;
  endDate: string;
  dailyTarget: number;
  createdAt: string;
  updatedAt: string;
  _count: {
    missionDays: number;
  };
}

export default function AdminCampaignDetailPage() {
  const params = useParams();
  const campaignId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (campaignId) {
      loadCampaign();
    }
  }, [campaignId]);

  const loadCampaign = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/campaigns/${campaignId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '캠페인 정보를 불러올 수 없습니다.');
      }

      const data = await response.json();
      setCampaign(data.campaign);
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
      hour: "2-digit",
      minute: "2-digit"
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
            title="캠페인 상세"
            description="캠페인 정보를 확인합니다."
          />
        }
      >
        <div className="flex items-center justify-center min-h-96">
          <div className="text-lg">로딩 중...</div>
        </div>
      </PageShell>
    );
  }

  if (error || !campaign) {
    return (
      <PageShell
        header={
          <AdminHeader
            title="캠페인 상세"
            description="캠페인 정보를 확인합니다."
          />
        }
      >
        <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
          <div className="text-lg text-red-500">{error || '캠페인을 찾을 수 없습니다.'}</div>
          <ButtonLink href="/admin/campaigns" variant="secondary">
            캠페인 목록으로 돌아가기
          </ButtonLink>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      header={
        <AdminHeader
          title="캠페인 상세"
          description={`${campaign.place?.name || '장소 정보 없음'} - ${campaign.productOrders?.[0]?.product?.name || '상품 정보 없음'}`}
        />
      }
    >
      <div className="space-y-6">
        <Card>
          <CardBody className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-lg font-semibold text-zinc-50">
                {campaign.place?.name || '장소 정보 없음'}
              </div>
              <Pill tone={
                campaign.status === "ACTIVE" ? "emerald" :
                campaign.status === "DRAFT" ? "neutral" :
                campaign.status === "PAUSED" ? "red" : "neutral"
              }>
                {campaign.status === "ACTIVE" ? "활성" :
                 campaign.status === "DRAFT" ? "초안" :
                 campaign.status === "PAUSED" ? "일시중지" : campaign.status}
              </Pill>
            </div>

            <div className="grid gap-2 text-sm">
              <div className="text-zinc-400">
                <span className="font-medium">광고주:</span> {campaign.advertiser?.user?.name || campaign.advertiser?.user?.email || '광고주 정보 없음'}
              </div>
              <div className="text-zinc-400">
                <span className="font-medium">장소:</span> {campaign.place?.name || '장소 정보 없음'}
              </div>
              <div className="text-zinc-400">
                <span className="font-medium">상품:</span> {campaign.productOrders?.[0]?.product?.name || '상품 정보 없음'} ({campaign.productOrders?.[0]?.product?.missionType || campaign.missionType || '미션 유형 없음'})
              </div>
              <div className="text-zinc-400">
                <span className="font-medium">일일 목표:</span> {formatNumber(campaign.dailyTarget || 0)}명
              </div>
              <div className="text-zinc-400">
                <span className="font-medium">기간:</span> {campaign.startDate ? formatDate(campaign.startDate) : '시작일 없음'} ~ {campaign.endDate ? formatDate(campaign.endDate) : '종료일 없음'}
              </div>
              <div className="text-zinc-400">
                <span className="font-medium">미션 일수:</span> {formatNumber(campaign._count?.missionDays || 0)}일
              </div>
              <div className="text-zinc-400">
                <span className="font-medium">생성일:</span> {campaign.createdAt ? formatDate(campaign.createdAt) : '생성일 없음'}
              </div>
              <div className="text-zinc-400">
                <span className="font-medium">수정일:</span> {campaign.updatedAt ? formatDate(campaign.updatedAt) : '수정일 없음'}
              </div>
            </div>

            <div className="text-sm text-zinc-300">
              <span className="font-medium">상품 설명:</span>
              <div className="mt-1 text-zinc-400">{campaign.productOrders?.[0]?.product?.marketingCopy || '상품 설명이 없습니다.'}</div>
            </div>
          </CardBody>
        </Card>

        <div className="flex justify-end">
          <ButtonLink href="/admin/campaigns" variant="secondary" size="sm">
            목록으로 돌아가기
          </ButtonLink>
        </div>
      </div>
    </PageShell>
  );
}
