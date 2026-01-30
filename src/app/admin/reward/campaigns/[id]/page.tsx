"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageShell } from "@/app/_ui/shell";
import { AdminHeader } from "@/app/admin/_components/AdminHeader";
import { Button, ButtonLink, Card, CardBody, DividerList, EmptyState, Input, Label, Pill, TextArea } from "@/app/_ui/primitives";
import { ImageLightbox } from "@/app/_ui/ImageLightbox";
import { getCampaignStatusLabel, getParticipationStatusLabel } from "@/lib/status-labels";

type Participation = {
  id: string;
  status: string;
  submittedAt: string | null;
  decidedAt: string | null;
  failureReason: string | null;
  proofText: string | null;
  rewarder: { user: { email: string | null; name: string | null } };
  missionDay: { date: string };
  evidences: Array<{ id: string; type: "IMAGE" | "VIDEO"; fileRef: string | null; createdAt: string }>;
};

type CampaignButton = { id?: string; label: string; url: string; sortOrder: number };

type Campaign = {
  id: string;
  name: string;
  status: string;
  missionType: string;
  dailyTarget: number;
  rewardKrw: number;
  startDate: string;
  endDate: string;
  missionText: string | null;
  buttons: Array<{ id: string; label: string; url: string; sortOrder: number }>;
  place: { name: string };
};

export default function AdminRewardCampaignDetailPage({ params }: { params: { id: string } }) {
  const sp = useSearchParams();
  const tabParam = sp?.get("tab");
  const tab = tabParam === "evaluation" ? "evaluation" : "dashboard";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [order, setOrder] = useState<{ id: string; startDate: string; endDate: string; status: string } | null>(null);
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    missionText: "",
    startDate: "",
    endDate: "",
    buttons: [] as CampaignButton[]
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Refs for focusing on error fields
  const nameRef = useRef<HTMLInputElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const cRes = await fetch(`/api/admin/reward/campaigns/${params.id}`);
      const cJson = await cRes.json().catch(() => ({}));
      if (!cRes.ok) throw new Error(cJson.error || "캠페인 정보를 불러올 수 없습니다.");
      setCampaign({
        id: cJson.campaign.id,
        name: cJson.campaign.name,
        status: cJson.campaign.status,
        missionType: cJson.campaign.missionType,
        dailyTarget: cJson.campaign.dailyTarget,
        rewardKrw: cJson.campaign.rewardKrw,
        startDate: cJson.campaign.startDate,
        endDate: cJson.campaign.endDate,
        missionText: cJson.campaign.missionText ?? null,
        buttons: cJson.campaign.buttons ?? [],
        place: { name: cJson.campaign.place.name }
      });
      setOrder(cJson.order ?? null);
      setForm({
        name: cJson.campaign.name ?? "",
        missionText: cJson.campaign.missionText ?? "",
        startDate: new Date(cJson.campaign.startDate).toISOString().slice(0, 10),
        endDate: new Date(cJson.campaign.endDate).toISOString().slice(0, 10),
        buttons: (cJson.campaign.buttons ?? []).map((b: any) => ({
          id: b.id,
          label: b.label,
          url: b.url,
          sortOrder: b.sortOrder
        }))
      });

      const pRes = await fetch(`/api/admin/reward/campaigns/${params.id}/participations`);
      const pJson = await pRes.json().catch(() => ({}));
      if (!pRes.ok) throw new Error(pJson.error || "참여 목록을 불러올 수 없습니다.");
      setParticipations(pJson.participations || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const saveCampaign = async () => {
    if (!campaign || !order) return;
    setSaving(true);
    setError(null);
    setFieldErrors({});
    
    try {
      const start = new Date(form.startDate);
      const end = new Date(form.endDate);
      
      // Validate dates
      if (Number.isNaN(start.getTime())) {
        setFieldErrors({ startDate: "시작일을 입력해주세요." });
        startDateRef.current?.focus();
        return;
      }
      if (Number.isNaN(end.getTime())) {
        setFieldErrors({ endDate: "종료일을 입력해주세요." });
        endDateRef.current?.focus();
        return;
      }
      
      if (start > end) {
        setFieldErrors({ 
          startDate: "시작일은 종료일보다 이전이어야 합니다.",
          endDate: "종료일은 시작일보다 이후여야 합니다."
        });
        startDateRef.current?.focus();
        return;
      }
      
      const purchaseStart = new Date(order.startDate);
      const purchaseEnd = new Date(order.endDate);
      
      if (start < purchaseStart) {
        setFieldErrors({ startDate: "시작일은 구매 기간 범위 내여야 합니다." });
        startDateRef.current?.focus();
        return;
      }
      
      if (end > purchaseEnd) {
        setFieldErrors({ endDate: "종료일은 구매 기간 범위 내여야 합니다." });
        endDateRef.current?.focus();
        return;
      }

      const res = await fetch(`/api/admin/reward/campaigns/${campaign.id}`, {
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
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const activate = async () => {
    if (!campaign) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reward/campaigns/${campaign.id}/activate`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "활성화에 실패했습니다.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "활성화에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const pause = async () => {
    if (!campaign) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reward/campaigns/${campaign.id}/pause`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "비활성화에 실패했습니다.");
      await load();
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

  const approve = async (id: string) => {
    setProcessingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reward/participations/${id}/approve`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "승인에 실패했습니다.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "승인에 실패했습니다.");
    } finally {
      setProcessingId(null);
    }
  };

  const reject = async (id: string) => {
    setProcessingId(id);
    setError(null);
    try {
      const reason = (rejectReason[id] || "").trim();
      if (!reason) throw new Error("반려 사유를 입력해주세요.");
      const res = await fetch(`/api/admin/reward/participations/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "반려에 실패했습니다.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "반려에 실패했습니다.");
    } finally {
      setProcessingId(null);
    }
  };

  const counts = useMemo(() => {
    const pending = participations.filter((p) => p.status === "PENDING_REVIEW" || p.status === "MANUAL_REVIEW").length;
    const approved = participations.filter((p) => p.status === "APPROVED").length;
    const rejected = participations.filter((p) => p.status === "REJECTED").length;
    return { pending, approved, rejected };
  }, [participations]);

  return (
    <PageShell
      header={
        <AdminHeader
          title={campaign ? `리워드 · ${campaign.place.name}` : "리워드 · 캠페인"}
          description={campaign ? `${campaign.name} · ${campaign.missionType}` : "캠페인 상세"}
        />
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <ButtonLink href={`/admin/reward/campaigns/${params.id}?tab=dashboard`} variant={tab === "dashboard" ? "primary" : "secondary"} size="sm">
            대시보드
          </ButtonLink>
          <ButtonLink
            href={`/admin/reward/campaigns/${params.id}?tab=evaluation`}
            variant={tab === "evaluation" ? "primary" : "secondary"}
            size="sm"
          >
            수행 평가
          </ButtonLink>
        </div>

        {loading ? (
          <Card>
            <CardBody className="text-sm text-zinc-400">로딩 중...</CardBody>
          </Card>
        ) : error ? (
          <Card>
            <CardBody className="text-sm text-red-400">{error}</CardBody>
          </Card>
        ) : !campaign || !order ? (
          <Card>
            <CardBody className="text-sm text-zinc-400">캠페인을 찾을 수 없습니다.</CardBody>
          </Card>
        ) : tab === "dashboard" ? (
          <div className="space-y-6">
            <Card>
              <CardBody className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold text-zinc-50">{campaign.name}</div>
                    <Pill tone={campaign.status === "ACTIVE" ? "emerald" : campaign.status === "PAUSED" ? "neutral" : "cyan"}>
                      {getCampaignStatusLabel(campaign.status)}
                    </Pill>
                    <Pill tone="neutral">{campaign.missionType}</Pill>
                  </div>
                  <div className="flex items-center gap-2">
                    {campaign.status === "ACTIVE" ? (
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

                <div className="text-xs text-zinc-500">
                  기간: {new Date(campaign.startDate).toLocaleDateString("ko-KR")} ~{" "}
                  {new Date(campaign.endDate).toLocaleDateString("ko-KR")}
                </div>
                <div className="text-xs text-zinc-500">
                  리워드: {campaign.rewardKrw.toLocaleString()}원 · 일일 목표 {campaign.dailyTarget}
                </div>
                <div className="text-xs text-zinc-500">
                  구매 기간: {new Date(order.startDate).toLocaleDateString("ko-KR")} ~{" "}
                  {new Date(order.endDate).toLocaleDateString("ko-KR")}
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
                    <div className="text-xs text-zinc-400">검수 대기</div>
                    <div className="mt-1 text-sm font-semibold text-zinc-50">{counts.pending}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
                    <div className="text-xs text-zinc-400">승인</div>
                    <div className="mt-1 text-sm font-semibold text-zinc-50">{counts.approved}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
                    <div className="text-xs text-zinc-400">반려</div>
                    <div className="mt-1 text-sm font-semibold text-zinc-50">{counts.rejected}</div>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="space-y-4">
                <div className="text-sm font-semibold text-zinc-50">캠페인 수정</div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">캠페인 이름</Label>
                    <Input 
                      id="name" 
                      ref={nameRef}
                      value={form.name} 
                      onChange={(e) => {
                        setForm((p) => ({ ...p, name: e.target.value }));
                        if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: "" }));
                      }} 
                    />
                    {fieldErrors.name && <div className="text-xs text-red-400">{fieldErrors.name}</div>}
                  </div>
                  <div className="space-y-2">
                    <Label>미션 타입 / 일일 목표</Label>
                    <div className="rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-200">
                      {campaign.missionType} · {campaign.dailyTarget} / day · 리워드 {campaign.rewardKrw}원
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">시작일 (구매 범위 내)</Label>
                    <Input
                      id="startDate"
                      ref={startDateRef}
                      type="date"
                      value={form.startDate}
                      min={new Date(order.startDate).toISOString().slice(0, 10)}
                      max={new Date(order.endDate).toISOString().slice(0, 10)}
                      onChange={(e) => {
                        setForm((p) => ({ ...p, startDate: e.target.value }));
                        if (fieldErrors.startDate) setFieldErrors((prev) => ({ ...prev, startDate: "" }));
                      }}
                    />
                    {fieldErrors.startDate && <div className="text-xs text-red-400">{fieldErrors.startDate}</div>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">종료일 (구매 범위 내)</Label>
                    <Input
                      id="endDate"
                      ref={endDateRef}
                      type="date"
                      value={form.endDate}
                      min={new Date(order.startDate).toISOString().slice(0, 10)}
                      max={new Date(order.endDate).toISOString().slice(0, 10)}
                      onChange={(e) => {
                        setForm((p) => ({ ...p, endDate: e.target.value }));
                        if (fieldErrors.endDate) setFieldErrors((prev) => ({ ...prev, endDate: "" }));
                      }}
                    />
                    {fieldErrors.endDate && <div className="text-xs text-red-400">{fieldErrors.endDate}</div>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="missionText">상세 정보(미션)</Label>
                  <TextArea label="" value={form.missionText} onChange={(v) => setForm((p) => ({ ...p, missionText: v }))} rows={8} />
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
              </CardBody>
            </Card>
          </div>
        ) : (
          <Card>
            <CardBody className="space-y-4">
              <div className="text-sm font-semibold text-zinc-50">수행 평가 (최근 100건)</div>
              <div className="text-xs text-zinc-400">PENDING_REVIEW/MANUAL_REVIEW 상태가 기본으로 표시됩니다.</div>
              <DividerList>
                {participations.length === 0 ? (
                  <EmptyState title="검수할 항목이 없습니다." />
                ) : (
                  participations.map((p) => {
                    const pending = p.status === "PENDING_REVIEW" || p.status === "MANUAL_REVIEW";
                    const imageItems = p.evidences
                      .filter((e) => e.type === "IMAGE" && e.fileRef)
                      .map((e) => ({ id: e.id, src: e.fileRef as string }));
                    const imageIndexMap = new Map(imageItems.map((item, idx) => [item.id, idx]));
                    return (
                      <div key={p.id} className="py-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="space-y-2 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-semibold text-zinc-50">
                                {p.rewarder.user.name ?? p.rewarder.user.email ?? "멤버"}
                              </div>
                              <Pill tone={pending ? "cyan" : p.status === "APPROVED" ? "emerald" : "red"}>{getParticipationStatusLabel(p.status)}</Pill>
                            </div>
                            <div className="text-xs text-zinc-500">
                              집행일: {new Date(p.missionDay.date).toLocaleDateString("ko-KR")} · 제출:{" "}
                              {p.submittedAt ? new Date(p.submittedAt).toLocaleString("ko-KR") : "—"}
                            </div>
                            {p.proofText ? (
                              <div className="whitespace-pre-wrap text-sm text-zinc-300">{p.proofText}</div>
                            ) : null}
                            {p.failureReason ? <div className="text-xs text-red-200">사유: {p.failureReason}</div> : null}
                            {p.evidences.length > 0 ? (
                              <div className="mt-2 overflow-hidden rounded-xl border border-white/10 bg-zinc-950/40 p-2">
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                  {p.evidences.map((e) => {
                                    if (!e.fileRef) {
                                      return (
                                        <div
                                          key={e.id}
                                          className="flex h-24 items-center justify-center rounded-lg border border-white/10 text-xs text-zinc-500"
                                        >
                                          미리보기 없음
                                        </div>
                                      );
                                    }

                                    if (e.type === "VIDEO") {
                                      return (
                                        <div key={e.id} className="overflow-hidden rounded-lg border border-white/10">
                                          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                                          <video
                                            src={e.fileRef}
                                            controls
                                            preload="metadata"
                                            className="h-24 w-full object-cover"
                                          />
                                        </div>
                                      );
                                    }

                                    const initialIndex = imageIndexMap.get(e.id) ?? 0;
                                    return (
                                      <ImageLightbox
                                        key={e.id}
                                        items={imageItems.map((item) => ({ src: item.src }))}
                                        initialIndex={initialIndex}
                                        trigger={
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img src={e.fileRef} alt="evidence" className="h-24 w-full rounded-lg object-cover" />
                                        }
                                      />
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-zinc-500">증빙 없음</div>
                            )}
                          </div>

                          {pending ? (
                            <div className="space-y-2 w-full sm:w-[360px]">
                              <Button
                                onClick={() => approve(p.id)}
                                disabled={processingId === p.id}
                                variant="primary"
                                className="w-full"
                              >
                                {processingId === p.id ? "처리 중..." : "승인"}
                              </Button>
                              <div className="flex gap-2">
                                <Input
                                  placeholder="반려 사유"
                                  maxLength={200}
                                  value={rejectReason[p.id] ?? ""}
                                  onChange={(e) => setRejectReason((prev) => ({ ...prev, [p.id]: e.target.value }))}
                                  className="flex-1"
                                />
                                <Button
                                  onClick={() => reject(p.id)}
                                  disabled={processingId === p.id}
                                  variant="danger"
                                >
                                  반려
                                </Button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </DividerList>
            </CardBody>
          </Card>
        )}

        <div className="flex flex-wrap gap-3">
          <Link href="/admin/reward/campaigns" className="text-sm text-zinc-300 hover:underline underline-offset-4">
            ← 캠페인 목록
          </Link>
        </div>
      </div>
    </PageShell>
  );
}


