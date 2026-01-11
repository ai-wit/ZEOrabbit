"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageShell } from "@/app/_ui/shell";
import { AdminHeader } from "@/app/admin/_components/AdminHeader";
import { Button, ButtonLink, Card, CardBody, DividerList, EmptyState, Input, Pill } from "@/app/_ui/primitives";
import { ImageLightbox } from "@/app/_ui/ImageLightbox";

type Participation = {
  id: string;
  status: string;
  submittedAt: string | null;
  decidedAt: string | null;
  failureReason: string | null;
  proofText: string | null;
  rewarder: { user: { email: string | null; name: string | null } };
  missionDay: { date: string };
  evidences: Array<{ type: "IMAGE" | "VIDEO"; fileRef: string | null; createdAt: string }>;
};

type Campaign = {
  id: string;
  name: string;
  status: string;
  missionType: string;
  rewardKrw: number;
  startDate: string;
  endDate: string;
  place: { name: string };
};

export default function AdminRewardCampaignDetailPage({ params }: { params: { id: string } }) {
  const sp = useSearchParams();
  const tab = sp?.get("tab") === "evaluation" ? "evaluation" : "overview";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

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
        rewardKrw: cJson.campaign.rewardKrw,
        startDate: cJson.campaign.startDate,
        endDate: cJson.campaign.endDate,
        place: { name: cJson.campaign.place.name }
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
          <ButtonLink href={`/admin/reward/campaigns/${params.id}?tab=overview`} variant={tab === "overview" ? "primary" : "secondary"} size="sm">
            대시보드
          </ButtonLink>
          <ButtonLink
            href={`/admin/reward/campaigns/${params.id}?tab=evaluation`}
            variant={tab === "evaluation" ? "primary" : "secondary"}
            size="sm"
          >
            수행 평가
          </ButtonLink>
          <ButtonLink href="/admin/reward/product-orders" variant="secondary" size="sm">
            구매 목록
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
        ) : !campaign ? (
          <Card>
            <CardBody className="text-sm text-zinc-400">캠페인을 찾을 수 없습니다.</CardBody>
          </Card>
        ) : tab === "overview" ? (
          <Card>
            <CardBody className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-semibold text-zinc-50">{campaign.name}</div>
                <Pill tone={campaign.status === "ACTIVE" ? "emerald" : campaign.status === "PAUSED" ? "neutral" : "cyan"}>
                  {campaign.status}
                </Pill>
                <Pill tone="neutral">{campaign.missionType}</Pill>
              </div>
              <div className="text-xs text-zinc-500">
                기간: {new Date(campaign.startDate).toLocaleDateString("ko-KR")} ~ {new Date(campaign.endDate).toLocaleDateString("ko-KR")}
              </div>
              <div className="text-xs text-zinc-500">리워드: {campaign.rewardKrw.toLocaleString()}원</div>
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
                    const ev = p.evidences[0] ?? null;
                    const src = ev?.fileRef ?? null;
                    const isVideo = ev?.type === "VIDEO";
                    const pending = p.status === "PENDING_REVIEW" || p.status === "MANUAL_REVIEW";
                    return (
                      <div key={p.id} className="py-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="space-y-2 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-semibold text-zinc-50">
                                {p.rewarder.user.name ?? p.rewarder.user.email ?? "멤버"}
                              </div>
                              <Pill tone={pending ? "cyan" : p.status === "APPROVED" ? "emerald" : "red"}>{p.status}</Pill>
                            </div>
                            <div className="text-xs text-zinc-500">
                              집행일: {new Date(p.missionDay.date).toLocaleDateString("ko-KR")} · 제출:{" "}
                              {p.submittedAt ? new Date(p.submittedAt).toLocaleString("ko-KR") : "—"}
                            </div>
                            {p.proofText ? (
                              <div className="whitespace-pre-wrap text-sm text-zinc-300">{p.proofText}</div>
                            ) : null}
                            {p.failureReason ? <div className="text-xs text-red-200">사유: {p.failureReason}</div> : null}
                            {src ? (
                              <div className="mt-2 overflow-hidden rounded-xl border border-white/10 bg-zinc-950/40 p-2">
                                {isVideo ? (
                                  // eslint-disable-next-line jsx-a11y/media-has-caption
                                  <video src={src} controls preload="metadata" className="h-48 w-full rounded-lg object-contain" />
                                ) : (
                                  <ImageLightbox
                                    src={src}
                                    trigger={
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={src} alt="evidence" className="h-48 w-full rounded-lg object-contain" />
                                    }
                                  />
                                )}
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
          <Link href="/admin/reward/product-orders" className="text-sm text-zinc-300 hover:underline underline-offset-4">
            ← 구매 목록
          </Link>
        </div>
      </div>
    </PageShell>
  );
}


