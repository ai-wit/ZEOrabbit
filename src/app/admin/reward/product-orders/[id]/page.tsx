"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/app/_ui/shell";
import { AdminHeader } from "@/app/admin/_components/AdminHeader";
import { Button, ButtonLink, Card, CardBody, Input, Label, Pill, TextArea } from "@/app/_ui/primitives";

type CampaignButton = { id?: string; label: string; url: string; sortOrder: number };

type OrderDetail = {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  dailyTarget: number;
  unitPriceKrw: number;
  totalAmountKrw: number;
  campaignId: string | null;
  advertiser: { id: string; user: { name: string | null; email: string | null } };
  place: { id: string; name: string };
  product: { id: string; name: string; missionType: string; guideText: string | null; marketingCopy: string | null };
  campaign: null | {
    id: string;
    name: string;
    status: string;
    missionType: string;
    dailyTarget: number;
    startDate: string;
    endDate: string;
    rewardKrw: number;
    missionText: string | null;
    buttons: Array<{ id: string; label: string; url: string; sortOrder: number }>;
  };
};

export default function AdminRewardProductOrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDetail | null>(null);

  const [form, setForm] = useState({
    name: "",
    missionText: "",
    startDate: "",
    endDate: "",
    buttons: [] as CampaignButton[]
  });

  const purchaseStart = order ? new Date(order.startDate) : null;
  const purchaseEnd = order ? new Date(order.endDate) : null;

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/reward/product-orders/${params.id}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "데이터를 불러올 수 없습니다.");
        const od: OrderDetail = json.order;
        setOrder(od);

        if (od.campaign) {
          setForm({
            name: od.campaign.name,
            missionText: od.campaign.missionText ?? "",
            startDate: new Date(od.campaign.startDate).toISOString().slice(0, 10),
            endDate: new Date(od.campaign.endDate).toISOString().slice(0, 10),
            buttons: od.campaign.buttons.map((b) => ({ id: b.id, label: b.label, url: b.url, sortOrder: b.sortOrder }))
          });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "데이터를 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [params.id]);

  const canRegister = useMemo(() => {
    return !!order && order.status === "FULFILLED" && !order.campaignId;
  }, [order]);

  const registerCampaign = async () => {
    if (!order) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reward/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productOrderId: order.id })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "캠페인 등록에 실패했습니다.");
      await router.refresh();
      // Reload detail to sync state
      const detail = await fetch(`/api/admin/reward/product-orders/${order.id}`).then((r) => r.json());
      setOrder(detail.order);
      if (detail.order.campaign) {
        setForm({
          name: detail.order.campaign.name,
          missionText: detail.order.campaign.missionText ?? "",
          startDate: new Date(detail.order.campaign.startDate).toISOString().slice(0, 10),
          endDate: new Date(detail.order.campaign.endDate).toISOString().slice(0, 10),
          buttons: detail.order.campaign.buttons.map((b: any) => ({ id: b.id, label: b.label, url: b.url, sortOrder: b.sortOrder }))
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "캠페인 등록에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const saveCampaign = async () => {
    if (!order?.campaign) return;
    setSaving(true);
    setError(null);
    try {
      const start = new Date(form.startDate);
      const end = new Date(form.endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new Error("기간을 입력해주세요.");
      if (start > end) throw new Error("기간이 올바르지 않습니다.");
      if (purchaseStart && start < purchaseStart) throw new Error("시작일은 구매 기간 범위 내여야 합니다.");
      if (purchaseEnd && end > purchaseEnd) throw new Error("종료일은 구매 기간 범위 내여야 합니다.");

      const res = await fetch(`/api/admin/reward/campaigns/${order.campaign.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          missionText: form.missionText || null,
          startDate: start,
          endDate: end,
          buttons: form.buttons
            .map((b, idx) => ({ ...b, sortOrder: Number.isFinite(b.sortOrder) ? b.sortOrder : idx }))
            .filter((b) => b.label.trim() && b.url.trim())
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "저장에 실패했습니다.");

      const detail = await fetch(`/api/admin/reward/product-orders/${order.id}`).then((r) => r.json());
      setOrder(detail.order);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const activate = async () => {
    if (!order?.campaign) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reward/campaigns/${order.campaign.id}/activate`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "활성화에 실패했습니다.");
      const detail = await fetch(`/api/admin/reward/product-orders/${order.id}`).then((r) => r.json());
      setOrder(detail.order);
    } catch (e) {
      setError(e instanceof Error ? e.message : "활성화에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const pause = async () => {
    if (!order?.campaign) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reward/campaigns/${order.campaign.id}/pause`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "비활성화에 실패했습니다.");
      const detail = await fetch(`/api/admin/reward/product-orders/${order.id}`).then((r) => r.json());
      setOrder(detail.order);
    } catch (e) {
      setError(e instanceof Error ? e.message : "비활성화에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const addButton = () => {
    setForm((prev) => ({
      ...prev,
      buttons: [...prev.buttons, { label: "", url: "", sortOrder: prev.buttons.length }]
    }));
  };

  if (loading) {
    return (
      <PageShell header={<AdminHeader title="리워드 · 구매 상세" description="로딩 중..." />}>
        <div className="text-sm text-zinc-400">로딩 중...</div>
      </PageShell>
    );
  }

  if (error && !order) {
    return (
      <PageShell header={<AdminHeader title="리워드 · 구매 상세" description="오류" />}>
        <div className="text-sm text-red-400">{error}</div>
        <div className="mt-4">
          <ButtonLink href="/admin/reward/product-orders" variant="secondary" size="sm">
            목록으로
          </ButtonLink>
        </div>
      </PageShell>
    );
  }

  if (!order) {
    return (
      <PageShell header={<AdminHeader title="리워드 · 구매 상세" description="없음" />}>
        <div className="text-sm text-zinc-400">데이터가 없습니다.</div>
        <div className="mt-4">
          <ButtonLink href="/admin/reward/product-orders" variant="secondary" size="sm">
            목록으로
          </ButtonLink>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      header={
        <AdminHeader
          title="리워드 · 구매 상세"
          description={`${order.product.name} · ${order.place.name}`}
        />
      }
    >
      <div className="space-y-6">
        <Card>
          <CardBody className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm font-semibold text-zinc-50">{order.product.name}</div>
              <Pill tone={order.status === "FULFILLED" ? "emerald" : "neutral"}>{order.status}</Pill>
              <Pill tone={order.campaignId ? "cyan" : "neutral"}>{order.campaignId ? "캠페인 등록됨" : "미등록"}</Pill>
            </div>
            <div className="text-xs text-zinc-400">
              광고주: {order.advertiser.user.name ?? order.advertiser.user.email ?? order.advertiser.id} · 장소: {order.place.name}
            </div>
            <div className="text-xs text-zinc-500">
              구매 기간: {new Date(order.startDate).toLocaleDateString("ko-KR")} ~ {new Date(order.endDate).toLocaleDateString("ko-KR")} · 일일 목표 {order.dailyTarget}
            </div>
            <div className="text-xs text-zinc-500">
              결제 금액: {order.totalAmountKrw.toLocaleString()}원 · 단가 {order.unitPriceKrw.toLocaleString()}원
            </div>
          </CardBody>
        </Card>

        {!order.campaign ? (
          <Card>
            <CardBody className="space-y-4">
              <div className="text-sm font-semibold text-zinc-50">캠페인 등록</div>
              <div className="text-sm text-zinc-300">
                결제 완료(FULFILLED)된 구매 건을 캠페인으로 등록합니다. 등록 후 활성화해야 멤버에게 노출됩니다.
              </div>
              <Button onClick={registerCampaign} disabled={!canRegister || saving} variant="primary" className="w-full">
                {saving ? "처리 중..." : "캠페인 등록"}
              </Button>
              {error ? <div className="text-sm text-red-400">{error}</div> : null}
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-semibold text-zinc-50">캠페인 관리</div>
                <div className="flex items-center gap-2">
                  <Pill tone={order.campaign.status === "ACTIVE" ? "emerald" : order.campaign.status === "PAUSED" ? "neutral" : "cyan"}>
                    {order.campaign.status}
                  </Pill>
                  {order.campaign.status === "ACTIVE" ? (
                    <Button onClick={pause} disabled={saving} variant="secondary" size="sm">
                      비활성화
                    </Button>
                  ) : (
                    <Button onClick={activate} disabled={saving} variant="primary" size="sm">
                      활성화
                    </Button>
                  )}
                </div>
              </div>

              {error ? <div className="text-sm text-red-400">{error}</div> : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">캠페인 이름</Label>
                  <Input id="name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>미션 타입 / 일일 목표</Label>
                  <div className="rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-200">
                    {order.campaign.missionType} · {order.campaign.dailyTarget} / day · 리워드 {order.campaign.rewardKrw}원
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">시작일 (구매 범위 내)</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={form.startDate}
                    min={new Date(order.startDate).toISOString().slice(0, 10)}
                    max={new Date(order.endDate).toISOString().slice(0, 10)}
                    onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">종료일 (구매 범위 내)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={form.endDate}
                    min={new Date(order.startDate).toISOString().slice(0, 10)}
                    max={new Date(order.endDate).toISOString().slice(0, 10)}
                    onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="missionText">상세 정보(미션)</Label>
                <TextArea
                  label=""
                  value={form.missionText}
                  onChange={(v) => setForm((p) => ({ ...p, missionText: v }))}
                  rows={8}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-zinc-50">추가 옵션 버튼</div>
                  <Button onClick={addButton} variant="secondary" size="sm">
                    버튼 추가
                  </Button>
                </div>
                <div className="space-y-3">
                  {form.buttons.length === 0 ? (
                    <div className="text-sm text-zinc-400">등록된 버튼이 없습니다.</div>
                  ) : (
                    form.buttons.map((b, idx) => (
                      <div key={b.id ?? idx} className="grid gap-3 sm:grid-cols-5">
                        <div className="sm:col-span-2">
                          <Input
                            value={b.label}
                            placeholder="버튼 이름"
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                buttons: p.buttons.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x))
                              }))
                            }
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <Input
                            value={b.url}
                            placeholder="https://..."
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                buttons: p.buttons.map((x, i) => (i === idx ? { ...x, url: e.target.value } : x))
                              }))
                            }
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <Button onClick={saveCampaign} disabled={saving} variant="primary" className="w-full">
                {saving ? "저장 중..." : "저장"}
              </Button>

              <div className="flex flex-wrap gap-3">
                <ButtonLink href={`/admin/reward/campaigns/${order.campaign.id}`} variant="secondary" size="sm">
                  캠페인 대시보드/평가 →
                </ButtonLink>
              </div>
            </CardBody>
          </Card>
        )}

        <div className="flex flex-wrap gap-3">
          <Link href="/admin/reward/product-orders" className="text-sm text-zinc-300 hover:underline underline-offset-4">
            ← 구매 목록
          </Link>
        </div>
      </div>
    </PageShell>
  );
}


