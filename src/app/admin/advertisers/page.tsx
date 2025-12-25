'use client';

import { useState, useEffect } from 'react';
import { prisma } from "@/server/prisma";
import { PageShell } from "@/app/_ui/shell";
import {
  Button,
  ButtonLink,
  Card,
  CardBody,
  DividerList,
  EmptyState,
  Pill
} from "@/app/_ui/primitives";
import { AdminHeader } from "../_components/AdminHeader";

function formatNumber(n: number): string {
  return new Intl.NumberFormat("ko-KR").format(n);
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

interface Advertiser {
  id: string;
  email: string;
  name: string;
  displayName: string;
  status: string;
  createdAt: string;
  placesCount: number;
  campaignsCount: number;
  managersCount: number;
  managers: Array<{
    name: string;
  }>;
  places: Array<{
    id: string;
    name: string;
  }>;
  campaigns: Array<{
    id: string;
    name: string;
  }>;
}

export default function AdvertisersPage() {
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPopover, setShowPopover] = useState(false);

  // 데이터 로드
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/advertisers');
      if (response.ok) {
        const data = await response.json();
        setAdvertisers(data.advertisers);
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewAdvertiserClick = () => {
    setShowPopover(true);
    setTimeout(() => setShowPopover(false), 2000); // 2초 후 자동 숨김
  };

  const advertisersData = advertisers;

  if (loading) {
    return (
      <PageShell
        header={
          <AdminHeader
            title="광고주 관리"
            description="광고주를 등록하고 관리하며, 매니저 할당을 변경할 수 있습니다."
          />
        }
      >
        <div className="flex items-center justify-center min-h-96">
          <div className="text-lg">로딩 중...</div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      header={
        <AdminHeader
          title="광고주 관리"
          description="광고주를 등록하고 관리하며, 매니저 할당을 변경할 수 있습니다."
        />
      }
    >
      <div className="space-y-6">
        {/* 등록 버튼 */}
        <div className="flex justify-end relative">
          <Button onClick={handleNewAdvertiserClick} variant="primary" size="sm">
            새 광고주 등록
          </Button>
          {showPopover && (
            <div className="absolute top-full mt-2 right-0 bg-zinc-800 text-zinc-100 px-3 py-2 rounded-lg shadow-lg border border-zinc-700 z-10">
              준비중입니다.
              <div className="absolute -top-1 right-4 w-2 h-2 bg-zinc-800 border-l border-t border-zinc-700 transform rotate-45"></div>
            </div>
          )}
        </div>

        {/* 광고주 목록 */}
        <Card>
          <CardBody className="space-y-4">
            <div className="text-sm font-semibold text-zinc-50">
              광고주 목록 ({formatNumber(advertisersData.length)}개)
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
              <DividerList>
                {advertisersData.length === 0 ? (
                  <EmptyState title="등록된 광고주가 없습니다." />
                ) : (
                  advertisersData.map((advertiser) => (
                    <div key={advertiser.id} className="px-6 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-zinc-50">
                              {advertiser.displayName || advertiser.name}
                            </div>
                            <Pill tone={advertiser.status === "ACTIVE" ? "emerald" : "red"}>
                              {advertiser.status === "ACTIVE" ? "활성" : "비활성"}
                            </Pill>
                          </div>
                          <div className="text-xs text-zinc-400">
                            {advertiser.email}
                          </div>
                          <div className="text-xs text-zinc-500">
                            장소: {formatNumber(advertiser.placesCount)}개 · 캠페인: {formatNumber(advertiser.campaignsCount)}개
                          </div>
                          <div className="text-xs text-zinc-500">
                            할당 매니저: {formatNumber(advertiser.managersCount)}명
                            {advertiser.managers.length > 0 && (
                              <span className="ml-2">
                                ({advertiser.managers.map(manager => manager.name).join(', ')})
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-zinc-500">
                            등록: {formatDateTime(new Date(advertiser.createdAt))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <ButtonLink href={`/admin/advertisers/${advertiser.id}`} variant="secondary" size="sm">
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