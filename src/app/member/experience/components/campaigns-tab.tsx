import { CampaignCard } from './campaign-card';
import type { ExperienceCampaign } from '../types';

interface CampaignsTabProps {
  campaigns: ExperienceCampaign[];
  loading: boolean;
  error: string | null;
  onApplyAsLeader: (campaign: ExperienceCampaign) => void;
  onApplyAsMember: (campaign: ExperienceCampaign) => void;
  onCardClick: (campaign: ExperienceCampaign) => void;
}

export function CampaignsTab({
  campaigns,
  loading,
  error,
  onApplyAsLeader,
  onApplyAsMember,
  onCardClick
}: CampaignsTabProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 text-lg">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <>
      {/* 공고 목록 */}
      <div className="space-y-4">
        {campaigns.map((campaign) => (
          <CampaignCard
            key={campaign.id}
            campaign={campaign}
            onApplyAsLeader={onApplyAsLeader}
            onApplyAsMember={onApplyAsMember}
            onCardClick={onCardClick}
          />
        ))}

        {campaigns.length === 0 && (
          <div className="text-center py-12">
            <p className="text-zinc-500 text-lg">현재 모집 중인 체험단 공고가 없습니다.</p>
          </div>
        )}
      </div>
    </>
  );
}
