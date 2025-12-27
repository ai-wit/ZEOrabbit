import type { ExperienceCampaign } from '../types';

interface CampaignCardProps {
  campaign: ExperienceCampaign;
  onApplyAsLeader: (campaign: ExperienceCampaign) => void;
  onApplyAsMember: (campaign: ExperienceCampaign) => void;
  onCardClick: (campaign: ExperienceCampaign) => void;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'available':
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-emerald-400/20 text-emerald-400 border border-emerald-400/30">참여 가능</span>;
    case 'applied_as_leader':
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">팀장 신청 중</span>;
    case 'applied_as_member':
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">팀원 신청 중</span>;
    case 'member':
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-400/20 text-blue-400 border border-blue-400/30">팀원</span>;
    case 'leader':
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-400/20 text-purple-400 border border-purple-400/30">팀장</span>;
    default:
      return null;
  }
}

export function CampaignCard({ campaign, onApplyAsLeader, onApplyAsMember, onCardClick }: CampaignCardProps) {
  return (
    <div
      className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 hover:border-zinc-600 hover:bg-zinc-800/50 transition-all cursor-pointer"
      onClick={() => onCardClick(campaign)}
    >
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        {/* 왼쪽: 제목과 설명 */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3">
            <h3 className="text-xl font-semibold text-zinc-50 line-clamp-2 mb-2 sm:mb-0">
              {campaign.title}
            </h3>
            <div className="flex-shrink-0">
              {getStatusBadge(campaign.userStatus)}
            </div>
          </div>

          {campaign.description && (
            <p className="text-sm text-zinc-300 mb-4 line-clamp-2">
              {campaign.description}
            </p>
          )}

          <div className="text-sm text-zinc-400 mb-3 space-y-1">
            <div>
              <span className="font-medium text-zinc-300">광고주:</span> {campaign.advertiser.user.name} · {' '}
              <span className="font-medium text-zinc-300">장소:</span> {campaign.place.name}
              {campaign.place.externalProvider && (
                <span className="text-xs text-zinc-500 ml-1">
                  ({campaign.place.externalProvider})
                </span>
              )}
            </div>
            <div>
              <span className="font-medium text-zinc-300">신청 마감:</span> {new Date(campaign.applicationDeadline).toLocaleDateString('ko-KR')} · {' '}
              <span className="font-medium text-zinc-300">체험 기간:</span> {new Date(campaign.startDate).toLocaleDateString('ko-KR')} ~ {new Date(campaign.endDate).toLocaleDateString('ko-KR')}
            </div>
          </div>
        </div>

        {/* 오른쪽: 상세 정보 그리드 */}
        <div className="flex-shrink-0">
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="text-zinc-400">
              <span className="font-medium text-zinc-300">팀 현황:</span> {campaign._count.teams} / {campaign.targetTeamCount}팀
            </div>
            <div className="text-zinc-400">
              <span className="font-medium text-zinc-300">팀당 인원:</span> 최대 {campaign.maxMembersPerTeam}명
            </div>
          </div>

          {/* 클릭 유도 표시 */}
          <div className="flex justify-end items-center mt-4 pt-4 border-t border-zinc-700">
            <div className="text-cyan-400 font-medium flex items-center text-sm">
              자세히 보기
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
