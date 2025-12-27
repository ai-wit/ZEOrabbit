import type { ExperienceCampaign } from '../types';

interface TeamSelectionModalProps {
  isOpen: boolean;
  campaign: ExperienceCampaign | null;
  onClose: () => void;
  onApplyToTeam: (teamId: string) => Promise<{ success: boolean; error?: string }>;
  applying: boolean;
}

export function TeamSelectionModal({
  isOpen,
  campaign,
  onClose,
  onApplyToTeam,
  applying
}: TeamSelectionModalProps) {
  const handleApply = async (teamId: string) => {
    const result = await onApplyToTeam(teamId);
    if (result.success) {
      alert('팀 참여 신청이 완료되었습니다. 팀장 승인을 기다려주세요.');
      onClose();
    } else {
      alert(result.error);
    }
  };

  if (!isOpen || !campaign) return null;

  const availableTeams = campaign.teams?.filter(team => team.status === 'FORMING') || [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-zinc-50 mb-4">팀 참여 신청</h2>
        <p className="text-zinc-400 mb-4">
          <strong className="text-zinc-50">{campaign.title}</strong> 체험단의 참여할 팀을 선택하세요.
        </p>

        <div className="space-y-3">
          {availableTeams.map((team) => (
            <div key={team.id} className="border border-white/10 rounded-lg p-4 hover:border-cyan-400/40 transition-colors bg-white/[0.02]">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium text-zinc-50">{team.name}</h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    팀장: {team.leaderId} · 현재 인원: {team._count.memberships}명
                  </p>
                  {team.description && (
                    <p className="text-sm text-zinc-500 mt-2">{team.description}</p>
                  )}
                </div>
                <button
                  onClick={() => handleApply(team.id)}
                  disabled={applying}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed ml-4 transition-colors"
                >
                  {applying ? '신청 중...' : '참여 신청'}
                </button>
              </div>
            </div>
          ))}
          {availableTeams.length === 0 && (
            <div className="text-center py-8 text-zinc-500">
              현재 모집 중인 팀이 없습니다.
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-zinc-400 border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
