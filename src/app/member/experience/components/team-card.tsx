import type { Team } from '../types';
import { getTeamStatusLabel } from '@/lib/status-labels';

interface TeamCardProps {
  team: Team;
  onCompleteFormation: (teamId: string) => void;
  onSubmitContent: (team: Team) => void;
}

export function TeamCard({ team, onCompleteFormation, onSubmitContent }: TeamCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">{team.name}</h3>
          <p className="text-gray-600 mt-1">
            {team.experienceCampaign.title} · {team.userRole === 'leader' ? '팀장' : '팀원'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            상태: {getTeamStatusLabel(team.status)}
          </p>
        </div>
        <div className="flex gap-2">
          {team.userRole === 'leader' && team.status === 'FORMING' && (
            <button
              onClick={() => onCompleteFormation(team.id)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
            >
              팀 구성 완료
            </button>
          )}
          {team.userRole === 'leader' && team.status === 'ACTIVE' && (
            <button
              onClick={() => onSubmitContent(team)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700"
            >
              자료 제출
            </button>
          )}
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            팀 관리
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-gray-500">팀원 수:</span>
          <span className="ml-2 font-medium">{team.memberships?.length || 0}명</span>
        </div>
        <div>
          <span className="text-gray-500">최대 인원:</span>
          <span className="ml-2 font-medium">{team.experienceCampaign.maxMembersPerTeam}명</span>
        </div>
        <div>
          <span className="text-gray-500">진행 기간:</span>
          <span className="ml-2 font-medium">
            {new Date(team.experienceCampaign.startDate).toLocaleDateString('ko-KR')} ~
            {new Date(team.experienceCampaign.endDate).toLocaleDateString('ko-KR')}
          </span>
        </div>
      </div>
    </div>
  );
}
