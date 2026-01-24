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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-text mb-4">팀 참여 신청</h2>
        <p className="text-text-subtle mb-4">
          <strong className="text-text">{campaign.title}</strong> 체험단의 참여할 팀을 선택하세요.
        </p>

        <div className="space-y-3">
          {availableTeams.map((team) => (
            <div key={team.id} className="border border-border rounded-lg p-4 hover:border-ring/40 transition-colors bg-surface-muted">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium text-text">{team.name}</h3>
                  <p className="text-sm text-text-subtle mt-1">
                    팀장: {team.leaderId} · 현재 인원: {team._count.memberships}명
                  </p>
                  {team.description && (
                    <p className="text-sm text-text-subtle mt-2">{team.description}</p>
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
            <div className="text-center py-8 text-text-subtle">
              현재 모집 중인 팀이 없습니다.
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-text-subtle border border-border rounded-lg hover:bg-surface-strong transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
