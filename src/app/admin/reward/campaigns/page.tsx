"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageShell } from "@/app/_ui/shell";
import { AdminHeader } from "@/app/admin/_components/AdminHeader";
import { Button, ButtonLink, Card, CardBody, DividerList, EmptyState, Pill } from "@/app/_ui/primitives";

type ManagedAdvertiser = {
  advertiserId: string;
  advertiser: { user: { name: string | null } };
};

type Order = {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  dailyTarget: number;
  totalAmountKrw: number;
  paymentId: string | null;
  campaignId: string | null;
  campaign?: { id: string; status: string } | null;
  createdAt: string;
  advertiser: { id: string; user: { name: string | null; email: string | null } };
  place: { id: string; name: string };
  product: { id: string; name: string; missionType: string };
};

export default function AdminRewardCampaignsPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const advertiserId = sp?.get("advertiserId") || "";

  const [loading, setLoading] = useState(true);
  const [managedAdvertisers, setManagedAdvertisers] = useState<ManagedAdvertiser[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [registeringOrderId, setRegisteringOrderId] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const advRes = await fetch("/api/admin/managers/assigned-advertisers");
        if (advRes.ok) {
          const advJson = await advRes.json().catch(() => ({}));
          setManagedAdvertisers(advJson.advertisers || []);
        }

        const url = new URL("/api/admin/reward/product-orders", window.location.origin);
        if (advertiserId) url.searchParams.set("advertiserId", advertiserId);
        const res = await fetch(url.toString());
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "목록을 불러올 수 없습니다.");
        setOrders(json.orders || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "목록을 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [advertiserId]);

  const registerCampaign = (orderId: string) => {
    // 세부 설정 페이지로 이동
    router.push(`/admin/reward/campaigns/new?orderId=${orderId}`);
  };

  return (
    <PageShell
      header={
        <AdminHeader title="캠페인 관리 - 구매 목록" description="담당 광고주의 구매 상품을 캠페인으로 등록/관리합니다." />
      }
    >
      <div className="space-y-6">
        <Card>
          <CardBody className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-semibold text-zinc-50">구매 목록</div>
              <div className="flex flex-wrap items-center gap-2">
                <ButtonLink href="/admin" variant="secondary" size="sm">
                  관리자 홈
                </ButtonLink>
              </div>
            </div>

            {managedAdvertisers.length > 0 ? (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <div className="text-sm text-zinc-300">광고주 필터</div>
                <select
                  value={advertiserId}
                  onChange={(e) => {
                    const next = e.target.value;
                    const params = new URLSearchParams();
                    if (next) params.set("advertiserId", next);
                    router.push(`/admin/reward/campaigns?${params.toString()}`);
                  }}
                  className="px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-md text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">전체 담당 광고주</option>
                  {managedAdvertisers.map((am) => (
                    <option key={am.advertiserId} value={am.advertiserId}>
                      {am.advertiser.user.name ?? am.advertiserId}
                    </option>
                  ))}
                </select>
                {advertiserId ? (
                  <Button onClick={() => router.push("/admin/reward/campaigns")} variant="secondary" size="sm">
                    필터 해제
                  </Button>
                ) : null}
              </div>
            ) : null}

            {error ? <div className="text-sm text-red-400">{error}</div> : null}
          </CardBody>
        </Card>

        <Card>
          <div className="border-b border-white/10 px-6 py-4 text-sm text-zinc-300">총 {orders.length}개</div>
          <DividerList>
            {loading ? (
              <div className="px-6 py-8 text-sm text-zinc-400">로딩 중...</div>
            ) : orders.length === 0 ? (
              <EmptyState title="구매 내역이 없습니다." />
            ) : (
              orders.map((o) => {
                const hasCampaign = !!o.campaignId;
                const canRegister = o.status === "FULFILLED" && !hasCampaign;
                const busy = registeringOrderId === o.id;
                return (
                  <div key={o.id} className="px-6 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-semibold text-zinc-50">{o.product.name}</div>
                          {hasCampaign ? (
                            <Pill tone={
                              o.campaign?.status === "ACTIVE" ? "emerald" :
                              o.campaign?.status === "DRAFT" ? "neutral" :
                              o.campaign?.status === "PAUSED" ? "red" :
                              o.campaign?.status === "ENDED" ? "neutral" : "cyan"
                            }>
                              {o.campaign?.status === "ACTIVE" ? "활성" :
                               o.campaign?.status === "DRAFT" ? "초안" :
                               o.campaign?.status === "PAUSED" ? "일시중지" :
                               o.campaign?.status === "ENDED" ? "종료됨" : "등록됨"}
                            </Pill>
                          ) : (
                            <Pill tone="neutral">미등록</Pill>
                          )}
                        </div>
                        <div className="text-xs text-zinc-400">
                          광고주: {o.advertiser.user.name ?? o.advertiser.user.email ?? o.advertiser.id} · 장소: {o.place.name}
                        </div>
                        <div className="text-xs text-zinc-500">
                          기간: {new Date(o.startDate).toLocaleDateString("ko-KR")} ~{" "}
                          {new Date(o.endDate).toLocaleDateString("ko-KR")} · 일일 목표 {o.dailyTarget} · 결제금액{" "}
                          {o.totalAmountKrw.toLocaleString()}원
                        </div>
                        <div className="text-xs text-zinc-500">구매일: {new Date(o.createdAt).toLocaleString("ko-KR")}</div>
                      </div>

                      {hasCampaign ? (
                        <ButtonLink href={`/admin/reward/campaigns/${o.campaignId}?tab=dashboard`} variant="secondary" size="sm">
                          캠페인 대시보드/평가
                        </ButtonLink>
                      ) : (
                        <Button onClick={() => registerCampaign(o.id)} disabled={!canRegister || busy} variant="primary" size="sm">
                          {busy ? "처리 중..." : "캠페인 등록"}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </DividerList>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Link href="/admin" className="text-sm text-zinc-300 hover:underline underline-offset-4">
            ← 관리자 홈
          </Link>
        </div>
      </div>
    </PageShell>
  );
}

