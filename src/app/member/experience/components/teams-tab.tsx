import { TeamCard } from './team-card';
import type { Team } from '../types';

interface TeamsTabProps {
  teams: Team[];
  loading: boolean;
  error: string | null;
  onCompleteFormation: (teamId: string) => void;
  onSubmitContent: (team: Team) => void;
}

export function TeamsTab({
  teams,
  loading,
  error,
  onCompleteFormation,
  onSubmitContent
}: TeamsTabProps) {
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
    <div className="space-y-6">
      {teams.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">참여 중인 팀이 없습니다.</p>
          <p className="text-gray-400 text-sm mt-2">체험단 공고에서 팀을 만들거나 참여해보세요.</p>
        </div>
      ) : (
        teams.map((team) => (
          <TeamCard
            key={team.id}
            team={team}
            onCompleteFormation={onCompleteFormation}
            onSubmitContent={onSubmitContent}
          />
        ))
      )}
    </div>
  );
}
