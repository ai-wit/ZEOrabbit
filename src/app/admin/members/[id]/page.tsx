"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/app/_ui/shell";
import {
  Button,
  ButtonLink,
  Card,
  CardBody,
  EmptyState,
  Input,
  Label,
  Select
} from "@/app/_ui/primitives";
import { AdminHeader } from "../../_components/AdminHeader";
import {
  getParticipationStatusLabel,
  getTeamMembershipStatusLabel,
  getTeamStatusLabel,
  getUserStatusLabel
} from "@/lib/status-labels";

interface MemberDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  memberType: string | null;
  profile: {
    age: number | null;
    gender: string | null;
    trustScore: number;
    warningCount: number;
  };
  points: {
    balanceKrw: number;
    availableKrw: number;
  };
  counts: {
    rewardParticipations: number;
    experienceMemberships: number;
    experienceLeaderTeams: number;
  };
}

interface RewardParticipation {
  id: string;
  status: string;
  startedAt: string;
  submittedAt: string | null;
  decidedAt: string | null;
  createdAt: string;
  missionDay: {
    date: string;
    campaign: {
      id: string;
      name: string;
      advertiser: { user: { name: string | null; email: string | null } };
      place: { name: string };
    };
  };
}

interface TeamMembershipActivity {
  id: string;
  role: string;
  status: string;
  appliedAt: string;
  decidedAt: string | null;
  team: {
    id: string;
    name: string;
    status: string;
    experienceCampaign: {
      id: string;
      title: string;
      advertiser: { user: { name: string | null; email: string | null } };
      place: { name: string };
    };
  };
}

interface LeaderTeamActivity {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  experienceCampaign: {
    id: string;
    title: string;
  };
}

interface ActivityPayload {
  rewardParticipations: RewardParticipation[];
  teamMemberships: TeamMembershipActivity[];
  leaderTeams: LeaderTeamActivity[];
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("ko-KR").format(n);
}

function formatDateTime(d: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(d));
}

function formatGender(gender: string | null): string {
  if (gender === "MALE") return "남성";
  if (gender === "FEMALE") return "여성";
  if (gender === "OTHER") return "기타";
  return "미등록";
}

function formatMemberType(memberType: string | null): string {
  if (memberType === "TEAM_LEADER") return "리더";
  if (memberType === "TEAM_PRO_LEADER") return "프로리더";
  return "일반";
}

export default function AdminMemberDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [activities, setActivities] = useState<ActivityPayload>({
    rewardParticipations: [],
    teamMemberships: [],
    leaderTeams: []
  });
  const [activeTab, setActiveTab] = useState<"info" | "activities">("info");
  const [resetLink, setResetLink] = useState<string>("");
  const [resetStatus, setResetStatus] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    age: "",
    gender: "",
    memberType: "NORMAL"
  });

  const loadMember = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/members/${params.id}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "회원 정보를 불러올 수 없습니다.");
      }
      const data = await response.json();
      setMember(data.member);
      setActivities(data.activities);
      setFormData({
        name: data.member.name ?? "",
        email: data.member.email ?? "",
        phone: data.member.phone ?? "",
        age: data.member.profile.age ? String(data.member.profile.age) : "",
        gender: data.member.profile.gender ?? "",
        memberType: data.member.memberType ?? "NORMAL"
      });
    } catch (err) {
      console.error("회원 상세 조회 실패:", err);
      setError(err instanceof Error ? err.message : "회원 정보를 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadMember();
  }, [loadMember]);

  const handleUpdate = async () => {
    try {
      if (!member) return;
      setSaving(true);
      setResetStatus(null);

      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        age: formData.age ? Number(formData.age) : null,
        gender: formData.gender ? formData.gender : null,
        memberType: formData.memberType
      };

      const response = await fetch(`/api/admin/members/${member.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "회원 정보를 수정할 수 없습니다.");
      }
      setResetStatus("회원 정보가 저장되었습니다.");
      await loadMember();
    } catch (err) {
      console.error("회원 정보 수정 실패:", err);
      setResetStatus(err instanceof Error ? err.message : "회원 정보를 수정할 수 없습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async (sendEmail: boolean) => {
    try {
      if (!member) return;
      setResetStatus(null);
      const response = await fetch(`/api/admin/members/${member.id}/password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendEmail })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "비밀번호 재설정 링크를 만들 수 없습니다.");
      }
      setResetLink(data.resetLink || "");
      setResetStatus(sendEmail ? "이메일 발송 요청을 저장했습니다." : "재설정 링크를 생성했습니다.");
    } catch (err) {
      console.error("비밀번호 재설정 실패:", err);
      setResetStatus(err instanceof Error ? err.message : "비밀번호 재설정 링크 생성 실패");
    }
  };

  const handleCopyLink = async () => {
    if (!resetLink) return;
    await navigator.clipboard.writeText(resetLink);
    setResetStatus("링크를 클립보드에 복사했습니다.");
  };

  const infoSummary = useMemo(() => {
    if (!member) return null;
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardBody className="space-y-2">
            <div className="text-xs text-text-subtle">포인트</div>
            <div className="text-xl font-semibold text-text">
              {formatNumber(member.points.balanceKrw)}P
            </div>
            <div className="text-xs text-text-subtle">
              사용 가능: {formatNumber(member.points.availableKrw)}P
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-2">
            <div className="text-xs text-text-subtle">활동</div>
            <div className="text-sm text-text">리워드 {formatNumber(member.counts.rewardParticipations)}</div>
            <div className="text-sm text-text">
              체험단 {formatNumber(member.counts.experienceMemberships + member.counts.experienceLeaderTeams)}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-2">
            <div className="text-xs text-text-subtle">계정 상태</div>
            <div className="text-sm text-text">{getUserStatusLabel(member.status)}</div>
            <div className="text-xs text-text-subtle">회원 등급 {formatMemberType(member.memberType)}</div>
            <div className="text-xs text-text-subtle">가입일 {formatDateTime(member.createdAt)}</div>
          </CardBody>
        </Card>
      </div>
    );
  }, [member]);

  if (loading) {
    return (
      <PageShell
        header={<AdminHeader title="회원 상세" description="회원 정보를 불러오는 중입니다." />}
      >
        <div className="flex items-center justify-center min-h-96 text-sm text-zinc-400">
          불러오는 중...
        </div>
      </PageShell>
    );
  }

  if (error || !member) {
    return (
      <PageShell
        header={<AdminHeader title="회원 상세" description="회원 정보를 불러올 수 없습니다." />}
      >
        <div className="space-y-4">
          <div className="text-sm text-red-400">{error || "회원 정보를 찾을 수 없습니다."}</div>
          <ButtonLink href="/admin/members" variant="secondary">
            목록으로 돌아가기
          </ButtonLink>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      header={
        <AdminHeader
          title="회원 상세"
          description={`${member.name || "이름 없음"} · ${member.email || "이메일 없음"}`}
        />
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <ButtonLink href="/admin/members" variant="secondary" size="sm">
            목록으로
          </ButtonLink>
          <Button
            variant={activeTab === "info" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setActiveTab("info")}
          >
            정보
          </Button>
          <Button
            variant={activeTab === "activities" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setActiveTab("activities")}
          >
            활동보기
          </Button>
        </div>

        {infoSummary}

        {activeTab === "info" ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="lg:col-span-2">
              <CardBody className="space-y-4">
                <div className="text-sm font-semibold text-text">개인정보 수정</div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">이름</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">이메일</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">전화번호</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">성별</Label>
                    <Select
                      id="gender"
                      value={formData.gender}
                      onChange={(e) => setFormData((prev) => ({ ...prev, gender: e.target.value }))}
                    >
                      <option value="">미등록</option>
                      <option value="MALE">남성</option>
                      <option value="FEMALE">여성</option>
                      <option value="OTHER">기타</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="age">연령</Label>
                    <Input
                      id="age"
                      type="number"
                      min={1}
                      max={120}
                      value={formData.age}
                      onChange={(e) => setFormData((prev) => ({ ...prev, age: e.target.value }))}
                      placeholder="예: 28"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="memberType">회원 등급</Label>
                    <Select
                      id="memberType"
                      value={formData.memberType}
                      onChange={(e) => setFormData((prev) => ({ ...prev, memberType: e.target.value }))}
                    >
                      <option value="NORMAL">일반</option>
                      <option value="TEAM_LEADER">리더</option>
                      <option value="TEAM_PRO_LEADER">프로리더</option>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button variant="primary" onClick={handleUpdate} disabled={saving}>
                    {saving ? "저장 중..." : "저장하기"}
                  </Button>
                  {resetStatus && <span className="text-xs text-text-subtle">{resetStatus}</span>}
                </div>
              </CardBody>
            </Card>

            <Card className="lg:col-span-2">
              <CardBody className="space-y-4">
                <div className="text-sm font-semibold text-text">비밀번호 재설정</div>
                <div className="text-xs text-text-subtle">
                  재설정 링크를 생성해 직접 전달하거나 이메일 발송 요청을 저장할 수 있습니다.
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button variant="primary" onClick={() => handlePasswordReset(false)}>
                    링크 생성
                  </Button>
                  <Button variant="secondary" onClick={() => handlePasswordReset(true)}>
                    이메일 발송
                  </Button>
                </div>
                {resetLink && (
                  <div className="space-y-2">
                    <Label>재설정 링크</Label>
                    <div className="flex flex-wrap items-center gap-2">
                      <Input value={resetLink} readOnly />
                      <Button className="ml-auto" variant="secondary" onClick={handleCopyLink}>
                        복사
                      </Button>
                    </div>
                  </div>
                )}
                {resetStatus && <div className="text-xs text-text-subtle">{resetStatus}</div>}
              </CardBody>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardBody className="space-y-3">
                <div className="text-sm font-semibold text-text">리워드 참여 활동</div>
                {activities.rewardParticipations.length === 0 ? (
                  <EmptyState title="리워드 참여 이력이 없습니다." />
                ) : (
                  <div className="space-y-2 text-sm">
                    {activities.rewardParticipations.map((item) => (
                      <div key={item.id} className="rounded-lg border border-border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-semibold text-text">
                            {item.missionDay.campaign.name}
                          </div>
                          <div className="text-xs text-text-subtle">
                            {getParticipationStatusLabel(item.status)}
                          </div>
                        </div>
                        <div className="text-xs text-text-subtle">
                          광고주 {item.missionDay.campaign.advertiser.user.name ??
                            item.missionDay.campaign.advertiser.user.email ??
                            "알 수 없음"}
                          {" · "}
                          장소 {item.missionDay.campaign.place.name}
                        </div>
                        <div className="text-xs text-text-subtle">
                          시작 {formatDateTime(item.startedAt)} · 참여일 {formatDateTime(item.createdAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardBody className="space-y-3">
                <div className="text-sm font-semibold text-text">체험단 활동</div>
                {activities.teamMemberships.length === 0 && activities.leaderTeams.length === 0 ? (
                  <EmptyState title="체험단 활동 이력이 없습니다." />
                ) : (
                  <div className="space-y-4 text-sm">
                    {activities.teamMemberships.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-text-subtle">팀 참여</div>
                        {activities.teamMemberships.map((item) => (
                          <div key={item.id} className="rounded-lg border border-border p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="font-semibold text-text">
                                {item.team.experienceCampaign.title}
                              </div>
                              <div className="text-xs text-text-subtle">
                                {getTeamMembershipStatusLabel(item.status)}
                              </div>
                            </div>
                            <div className="text-xs text-text-subtle">
                              팀 {item.team.name} · {getTeamStatusLabel(item.team.status)}
                            </div>
                            <div className="text-xs text-text-subtle">
                              광고주 {item.team.experienceCampaign.advertiser.user.name ??
                                item.team.experienceCampaign.advertiser.user.email ??
                                "알 수 없음"}
                              {" · "}
                              장소 {item.team.experienceCampaign.place.name}
                            </div>
                            <div className="text-xs text-text-subtle">
                              신청 {formatDateTime(item.appliedAt)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {activities.leaderTeams.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-text-subtle">팀장 활동</div>
                        {activities.leaderTeams.map((team) => (
                          <div key={team.id} className="rounded-lg border border-border p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="font-semibold text-text">{team.name}</div>
                              <div className="text-xs text-text-subtle">
                                {getTeamStatusLabel(team.status)}
                              </div>
                            </div>
                            <div className="text-xs text-text-subtle">
                              캠페인 {team.experienceCampaign.title} · 생성 {formatDateTime(team.createdAt)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </PageShell>
  );
}

