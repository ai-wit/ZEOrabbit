import type { ExperienceCampaign } from '../types';

interface CampaignDetailModalProps {
  isOpen: boolean;
  campaign: ExperienceCampaign | null;
  onClose: () => void;
  onApplyAsLeader: (campaign: ExperienceCampaign) => void;
  onApplyAsMember: (campaign: ExperienceCampaign) => void;
  onApplyToTeam: (teamId: string) => Promise<{ success: boolean; error?: string }>;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'available':
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">참여 가능</span>;
    case 'applied_as_leader':
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">팀장 신청 중</span>;
    case 'applied_as_member':
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">팀원 신청 중</span>;
    case 'leader_application_pending':
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-50 text-orange-700 border border-orange-200">팀장 신청 중</span>;
    case 'member':
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">팀원</span>;
    case 'leader':
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-50 text-purple-700 border border-purple-200">팀장</span>;
    default:
      return null;
  }
}

export function CampaignDetailModal({
  isOpen,
  campaign,
  onClose,
  onApplyAsLeader,
  onApplyAsMember,
  onApplyToTeam
}: CampaignDetailModalProps) {
  if (!isOpen || !campaign) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-border rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="border-b border-border px-6 py-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-text">{campaign.title}</h2>
              <div className="flex items-center gap-2 mt-2">
                {getStatusBadge(campaign.userStatus)}
                <span className="text-sm text-text-subtle">
                  {campaign.advertiser.user.name} · {campaign.place.name}
                  {campaign.place.externalProvider && ` (${campaign.place.externalProvider})`}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-text-subtle hover:text-text text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* 본문 */}
        <div className="px-6 py-6">
          {/* 기본 정보 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="space-y-6">
              {/* 체험단 기본 정보 */}
              <div>
                <h3 className="text-lg font-semibold text-text mb-3">체험단 정보</h3>
                <div className="bg-surface-muted rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-text-subtle">담당 매니저:</span>
                      <p className="text-text-muted mt-1">{campaign.manager.name}</p>
                    </div>
                    <div>
                      <span className="font-medium text-text-subtle">공고 상태:</span>
                      <p className="text-text-muted mt-1">{campaign.status === 'ACTIVE' ? '모집 중' : campaign.status === 'DRAFT' ? '임시 저장' : campaign.status}</p>
                    </div>
                    <div>
                      <span className="font-medium text-text-subtle">팀 현황:</span>
                      <p className="text-text-muted mt-1">{campaign._count.teams} / {campaign.targetTeamCount}팀</p>
                    </div>
                    <div>
                      <span className="font-medium text-text-subtle">팀당 최대 인원:</span>
                      <p className="text-text-muted mt-1">{campaign.maxMembersPerTeam}명</p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-border">
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div>
                        <span className="font-medium text-text-subtle">신청 마감:</span>
                        <span className="text-text-muted ml-2">{new Date(campaign.applicationDeadline).toLocaleDateString('ko-KR')}</span>
                      </div>
                      <div>
                        <span className="font-medium text-text-subtle">체험 기간:</span>
                        <span className="text-text-muted ml-2">{new Date(campaign.startDate).toLocaleDateString('ko-KR')} ~ {new Date(campaign.endDate).toLocaleDateString('ko-KR')}</span>
                      </div>
                      <div>
                        <span className="font-medium text-text-subtle">등록일:</span>
                        <span className="text-text-muted ml-2">{new Date(campaign.createdAt).toLocaleDateString('ko-KR')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 상세 설명 */}
              {campaign.description && (
                <div>
                  <h3 className="text-lg font-semibold text-text mb-3">상세 설명</h3>
                  <div className="bg-surface-muted rounded-lg p-4">
                    <p className="text-text-muted leading-relaxed">{campaign.description}</p>
                  </div>
                </div>
              )}

              {/* 미션 가이드 */}
              {campaign.missionGuide && (
                <div>
                  <h3 className="text-lg font-semibold text-text mb-3">미션 가이드</h3>
                  <div className="bg-surface-muted rounded-lg p-4">
                    <p className="text-text-muted leading-relaxed whitespace-pre-line">{campaign.missionGuide}</p>
                  </div>
                </div>
              )}

              {/* 제공 내역 */}
              {campaign.benefits && (
                <div>
                  <h3 className="text-lg font-semibold text-text mb-3">제공 내역</h3>
                  <div className="bg-surface-muted rounded-lg p-4">
                    <p className="text-text-muted leading-relaxed whitespace-pre-line">{campaign.benefits}</p>
                  </div>
                </div>
              )}
            </div>

            {/* 참여 가능한 팀 목록 */}
            <div>
              <h3 className="text-lg font-semibold text-text mb-4">참여 가능한 팀</h3>
              {campaign.teams && campaign.teams.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {campaign.teams.filter(team => team.status === 'FORMING').map((team) => (
                    <div key={team.id} className="border border-border-strong rounded-lg p-4 hover:border-ring/50 transition-colors bg-surface-muted">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-text text-base">{team.name}</h4>
                          <div className="flex items-center gap-4 mt-2 text-sm text-text-subtle">
                            <span>현재 인원: {team.memberships?.length || 0}명</span>
                            <span>최대 인원: {campaign.maxMembersPerTeam}명</span>
                          </div>
                          {team.description && (
                            <p className="text-sm text-text-muted mt-3 leading-relaxed">{team.description}</p>
                          )}
                        </div>
                      </div>
                      {campaign.userStatus === 'available' && (
                        <div className="flex justify-end pt-3 border-t border-border">
                          <button
                            onClick={async () => {
                              const result = await onApplyToTeam(team.id);
                              if (result.success) {
                                alert('팀 참여 신청이 완료되었습니다. 팀장 승인을 기다려주세요.');
                                onClose();
                              } else {
                                alert(result.error);
                              }
                            }}
                            className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                          >
                            참여 신청
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {campaign.teams.filter(team => team.status === 'FORMING').length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-text-subtle">현재 모집 중인 팀이 없습니다.</p>
                      <p className="text-text-subtle text-sm mt-1">팀장 신청을 통해 새로운 팀을 만들 수 있습니다.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-text-subtle">아직 생성된 팀이 없습니다.</p>
                  <p className="text-text-subtle text-sm mt-1">첫 번째 팀장이 되어 보세요!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 푸터 - 액션 버튼 */}
        <div className="border-t border-border px-6 py-4 bg-surface-muted">
          <div className="flex justify-between items-center">
            <div className="text-sm text-text-subtle">
              {campaign.canApplyAsLeader ? (
                <span className="text-emerald-700 font-medium">✓ 팀장 신청 가능</span>
              ) : campaign.userStatus === 'available' ? (
                <span className="text-blue-700 font-medium">✓ 팀 참여 가능</span>
              ) : (
                <span>참여 조건을 확인하세요</span>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-text-subtle border border-border rounded-lg hover:bg-surface-strong transition-colors"
              >
                닫기
              </button>

              {campaign.canApplyAsLeader && (
                <button
                  onClick={() => onApplyAsLeader(campaign)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  팀장 신청하기
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
