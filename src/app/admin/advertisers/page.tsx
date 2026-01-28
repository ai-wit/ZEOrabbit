"use client";

import { useState, useEffect } from "react";
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
import { getUserStatusLabel } from "@/lib/status-labels";

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
  const [filteredAdvertisers, setFilteredAdvertisers] = useState<Advertiser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPopover, setShowPopover] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [selectedAdvertiserId, setSelectedAdvertiserId] = useState<string>("");

  // 데이터 로드
  useEffect(() => {
    loadData();
  }, []);

  // 필터링 적용
  useEffect(() => {
    if (user?.adminType === "MANAGER") {
      // 매니저: 담당 광고주만 표시 (필터링 없음)
      setFilteredAdvertisers(advertisers);
    } else {
      // 슈퍼관리자: 선택된 광고주만 필터링하거나 전체 표시
      if (selectedAdvertiserId) {
        setFilteredAdvertisers(advertisers.filter(ad => ad.id === selectedAdvertiserId));
      } else {
        setFilteredAdvertisers(advertisers);
      }
    }
  }, [advertisers, selectedAdvertiserId, user]);

  const loadData = async () => {
    try {
      setLoading(true);

      // 사용자 정보 가져오기
      const userResponse = await fetch('/api/me');
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData.user);
      }

      // 광고주 데이터 가져오기
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
        {/* 등록 버튼 - 슈퍼관리자만 표시 */}
        {user && user.adminType !== "MANAGER" && (
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
        )}

        {/* 광고주 목록 */}
        <Card>
          <CardBody className="space-y-4">
            <div className="text-sm font-semibold text-zinc-50">
              광고주 목록 ({formatNumber(filteredAdvertisers.length)}개)
            </div>

            {/* 필터링 UI - 슈퍼관리자만 표시 */}
            {user && user.adminType !== "MANAGER" && (
              <div className="flex items-center gap-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                <span className="text-sm text-zinc-300">광고주 필터:</span>
                <select
                  value={selectedAdvertiserId}
                  onChange={(e) => setSelectedAdvertiserId(e.target.value)}
                  className="px-3 py-2 text-sm bg-zinc-700 border border-zinc-600 rounded-md text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">전체 광고주</option>
                  {advertisers.map((advertiser) => (
                    <option key={advertiser.id} value={advertiser.id}>
                      {advertiser.name}
                    </option>
                  ))}
                </select>
                {selectedAdvertiserId && (
                  <Button
                    onClick={() => setSelectedAdvertiserId("")}
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
                {filteredAdvertisers.length === 0 ? (
                  <EmptyState title="등록된 광고주가 없습니다." />
                ) : (
                  filteredAdvertisers.map((advertiser) => (
                    <div key={advertiser.id} className="px-6 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-zinc-50">
                              {advertiser.displayName || advertiser.name}
                            </div>
                            <Pill tone={advertiser.status === "ACTIVE" ? "emerald" : "red"}>
                              {getUserStatusLabel(advertiser.status)}
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