'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { requireRole } from "@/server/auth/require-user";
import { PageHeader, PageShell } from "@/app/_ui/shell";
import { Button } from "@/app/_ui/primitives";

interface TeamInfo {
  id: string;
  name: string;
  experienceCampaign: {
    title: string;
    advertiserName: string;
    placeName: string;
    startDate: string;
    endDate: string;
  };
  currentMembers: number;
  maxMembers: number;
  leaderName: string;
}

interface ValidationResult {
  isValid: boolean;
  isActive: boolean;
  isExpired: boolean;
  isUsedUp: boolean;
  teamFull: boolean;
  alreadyMember: boolean;
  campaignEnded: boolean;
  team: TeamInfo | null;
}

function JoinTeamPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get('code');

  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (code) {
      validateCode(code);
    } else {
      setLoading(false);
    }
  }, [code]);

  const validateCode = async (invitationCode: string) => {
    try {
      const response = await fetch(`/api/member/invitations/validate?code=${invitationCode}`);
      if (response.ok) {
        const data = await response.json();
        setValidation(data.validation);
      } else {
        setValidation({
          isValid: false,
          isActive: false,
          isExpired: false,
          isUsedUp: false,
          teamFull: false,
          alreadyMember: false,
          campaignEnded: false,
          team: null
        });
      }
    } catch (error) {
      console.error('초대코드 검증 실패:', error);
      setValidation({
        isValid: false,
        isActive: false,
        isExpired: false,
        isUsedUp: false,
        teamFull: false,
        alreadyMember: false,
        campaignEnded: false,
        team: null
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTeam = async () => {
    if (!code || !validation?.isValid) return;

    try {
      setJoining(true);
      const response = await fetch('/api/member/invitations/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      if (response.ok) {
        alert('팀 참여가 완료되었습니다!');
        router.push('/member/experience');
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      alert('팀 참여 중 오류가 발생했습니다');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <PageShell
        header={
          <PageHeader
            eyebrow="EXPERIENCE"
            title="팀 참여"
            description="초대코드를 확인하는 중입니다..."
          />
        }
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-lg text-zinc-400">로딩 중...</div>
        </div>
      </PageShell>
    );
  }

  if (!code) {
    return (
      <PageShell
        header={
          <PageHeader
            eyebrow="EXPERIENCE"
            title="팀 참여"
            description="유효하지 않은 접근입니다"
          />
        }
      >
        <div className="text-center py-12">
          <p className="text-red-400 text-lg mb-4">초대코드가 필요합니다.</p>
          <Button onClick={() => router.push('/member/experience')}>
            체험단 페이지로 돌아가기
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      header={
        <PageHeader
          eyebrow="EXPERIENCE"
          title="팀 참여"
          description={`초대코드: ${code}`}
        />
      }
    >
      <div className="max-w-2xl mx-auto">
        {validation?.isValid && validation.team ? (
          <div className="bg-zinc-900 border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-bold text-zinc-50 mb-4">팀 참여 확인</h2>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-zinc-400">체험단</label>
                  <p className="text-zinc-50">{validation.team.experienceCampaign.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-400">팀 이름</label>
                  <p className="text-zinc-50">{validation.team.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-400">광고주</label>
                  <p className="text-zinc-50">{validation.team.experienceCampaign.advertiserName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-400">장소</label>
                  <p className="text-zinc-50">{validation.team.experienceCampaign.placeName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-400">팀장</label>
                  <p className="text-zinc-50">{validation.team.leaderName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-400">팀원 현황</label>
                  <p className="text-zinc-50">{validation.team.currentMembers}/{validation.team.maxMembers}명</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-400">진행 기간</label>
                  <p className="text-zinc-50">
                    {new Date(validation.team.experienceCampaign.startDate).toLocaleDateString('ko-KR')} ~
                    {new Date(validation.team.experienceCampaign.endDate).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-emerald-400/10 border border-emerald-400/40 rounded-lg p-4 mb-6">
              <p className="text-emerald-400 text-sm">
                ✓ 이 초대코드로 참여하면 즉시 팀원으로 승인됩니다.
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={handleJoinTeam}
                disabled={joining}
                variant="primary"
                className="flex-1"
              >
                {joining ? '참여 중...' : '팀 참여하기'}
              </Button>
              <Button
                onClick={() => router.push('/member/experience')}
                variant="secondary"
              >
                취소
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-bold text-zinc-50 mb-4">초대코드 오류</h2>

            <div className="space-y-3 mb-6">
              {validation?.alreadyMember && (
                <div className="bg-yellow-400/10 border border-yellow-400/40 rounded-lg p-4">
                  <p className="text-yellow-400">이미 이 팀의 멤버이거나 참여 신청 중입니다.</p>
                </div>
              )}

              {validation?.isExpired && (
                <div className="bg-red-400/10 border border-red-400/40 rounded-lg p-4">
                  <p className="text-red-400">만료된 초대코드입니다.</p>
                </div>
              )}

              {validation?.isUsedUp && (
                <div className="bg-red-400/10 border border-red-400/40 rounded-lg p-4">
                  <p className="text-red-400">사용 횟수가 초과된 초대코드입니다.</p>
                </div>
              )}

              {validation?.teamFull && (
                <div className="bg-red-400/10 border border-red-400/40 rounded-lg p-4">
                  <p className="text-red-400">팀 정원이 가득 찼습니다.</p>
                </div>
              )}

              {validation?.campaignEnded && (
                <div className="bg-red-400/10 border border-red-400/40 rounded-lg p-4">
                  <p className="text-red-400">종료된 체험단입니다.</p>
                </div>
              )}

              {!validation?.isActive && !validation?.isExpired && !validation?.isUsedUp && !validation?.teamFull && !validation?.campaignEnded && !validation?.alreadyMember && (
                <div className="bg-red-400/10 border border-red-400/40 rounded-lg p-4">
                  <p className="text-red-400">유효하지 않은 초대코드입니다.</p>
                </div>
              )}
            </div>

            <Button onClick={() => router.push('/member/experience')}>
              체험단 페이지로 돌아가기
            </Button>
          </div>
        )}
      </div>
    </PageShell>
  );
}

export default function JoinTeamPage() {
  return (
    <Suspense fallback={
      <PageShell
        header={
          <PageHeader
            eyebrow="EXPERIENCE"
            title="팀 참여"
            description="초대코드를 확인하는 중입니다..."
          />
        }
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-lg text-zinc-400">로딩 중...</div>
        </div>
      </PageShell>
    }>
      <JoinTeamPageContent />
    </Suspense>
  );
}
