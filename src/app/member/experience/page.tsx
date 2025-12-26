'use client';

import { useState, useEffect } from 'react';

interface ExperienceCampaign {
  id: string;
  title: string;
  description?: string;
  targetTeamCount: number;
  maxMembersPerTeam: number;
  applicationDeadline: string;
  startDate: string;
  endDate: string;
  advertiser: {
    user: {
      name: string;
    };
  };
  place: {
    name: string;
    externalProvider?: string;
  };
  _count: {
    teams: number;
  };
  userStatus: 'available' | 'applied_as_leader' | 'member' | 'leader';
  canApplyAsLeader: boolean;
}

interface TeamApplicationForm {
  campaignId: string;
  teamName: string;
  teamDescription: string;
}

export default function ExperiencePage() {
  const [campaigns, setCampaigns] = useState<ExperienceCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<ExperienceCampaign | null>(null);
  const [applicationForm, setApplicationForm] = useState<TeamApplicationForm>({
    campaignId: '',
    teamName: '',
    teamDescription: ''
  });
  const [applying, setApplying] = useState(false);

  // 데이터 로드
  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/member/experience-campaigns');

      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns);
      }
    } catch (error) {
      console.error('공고 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 팀장 신청
  const handleApplyAsLeader = (campaign: ExperienceCampaign) => {
    setSelectedCampaign(campaign);
    setApplicationForm({
      campaignId: campaign.id,
      teamName: '',
      teamDescription: ''
    });
    setShowApplicationModal(true);
  };

  // 신청 제출
  const handleSubmitApplication = async () => {
    if (!applicationForm.teamName.trim()) return;

    try {
      setApplying(true);
      const response = await fetch('/api/member/experience-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(applicationForm)
      });

      if (response.ok) {
        setShowApplicationModal(false);
        setSelectedCampaign(null);
        setApplicationForm({ campaignId: '', teamName: '', teamDescription: '' });
        loadCampaigns(); // 목록 새로고침
        alert('팀장 신청이 완료되었습니다. 매니저 승인을 기다려주세요.');
      } else {
        const error = await response.json();
        alert(error.error || '신청 실패');
      }
    } catch (error) {
      console.error('신청 실패:', error);
      alert('신청 중 오류가 발생했습니다');
    } finally {
      setApplying(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">참여 가능</span>;
      case 'applied_as_leader':
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">팀장 신청 중</span>;
      case 'member':
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">팀원</span>;
      case 'leader':
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">팀장</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">체험단 공고</h1>
          <p className="mt-2 text-gray-600">
            참여하고 싶은 체험단 공고를 찾아보세요.
          </p>
        </div>

        {/* 공고 목록 */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-gray-900 line-clamp-2">
                  {campaign.title}
                </h3>
                {getStatusBadge(campaign.userStatus)}
              </div>

              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">광고주:</span> {campaign.advertiser.user.name}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">장소:</span> {campaign.place.name}
                  {campaign.place.externalProvider && (
                    <span className="text-xs text-gray-500 ml-1">
                      ({campaign.place.externalProvider})
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">팀 현황:</span> {campaign._count.teams} / {campaign.targetTeamCount}팀
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">팀당 인원:</span> 최대 {campaign.maxMembersPerTeam}명
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">신청 마감:</span>{' '}
                  {new Date(campaign.applicationDeadline).toLocaleDateString('ko-KR')}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">체험 기간:</span>{' '}
                  {new Date(campaign.startDate).toLocaleDateString('ko-KR')} ~ {' '}
                  {new Date(campaign.endDate).toLocaleDateString('ko-KR')}
                </p>
              </div>

              {campaign.description && (
                <p className="text-sm text-gray-700 mb-4 line-clamp-3">
                  {campaign.description}
                </p>
              )}

              {/* 액션 버튼 */}
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  {campaign.canApplyAsLeader ? (
                    <span className="text-green-600 font-medium">팀장 신청 가능</span>
                  ) : (
                    <span>참여 조건을 확인하세요</span>
                  )}
                </div>

                {campaign.canApplyAsLeader && (
                  <button
                    onClick={() => handleApplyAsLeader(campaign)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    팀장 신청
                  </button>
                )}
              </div>
            </div>
          ))}

          {campaigns.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 text-lg">현재 모집 중인 체험단 공고가 없습니다.</p>
            </div>
          )}
        </div>

        {/* 팀장 신청 모달 */}
        {showApplicationModal && selectedCampaign && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">팀장 신청</h2>
              <p className="text-gray-600 mb-4">
                <strong>{selectedCampaign.title}</strong> 체험단의 팀장으로 신청합니다.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    팀 이름
                  </label>
                  <input
                    type="text"
                    value={applicationForm.teamName}
                    onChange={(e) => setApplicationForm(prev => ({ ...prev, teamName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="팀 이름을 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    팀 설명 (선택사항)
                  </label>
                  <textarea
                    value={applicationForm.teamDescription}
                    onChange={(e) => setApplicationForm(prev => ({ ...prev, teamDescription: e.target.value }))}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="팀에 대한 간단한 설명을 입력하세요"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowApplicationModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={applying}
                >
                  취소
                </button>
                <button
                  onClick={handleSubmitApplication}
                  disabled={!applicationForm.teamName.trim() || applying}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {applying ? '신청 중...' : '신청하기'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
