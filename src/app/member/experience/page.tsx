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

function TeamManagementTab() {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [submissionForm, setSubmissionForm] = useState({
    materialsPath: '',
    materialsSize: 0,
    contentTitle: '',
    contentBody: '',
    contentLinks: [] as string[]
  });

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/member/teams');
      if (response.ok) {
        const data = await response.json();
        setTeams(data.teams);
      }
    } catch (error) {
      console.error('팀 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTeamFormation = async (teamId: string) => {
    if (!confirm('팀 구성을 완료하시겠습니까? 완료 후에는 팀원을 추가할 수 없습니다.')) {
      return;
    }

    try {
      const response = await fetch('/api/member/teams/complete-formation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId })
      });

      if (response.ok) {
        alert('팀 구성이 완료되었습니다.');
        loadTeams();
      } else {
        const error = await response.json();
        alert(error.error || '팀 구성 완료 실패');
      }
    } catch (error) {
      console.error('팀 구성 완료 실패:', error);
      alert('팀 구성 완료 중 오류가 발생했습니다');
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!selectedTeam) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      const response = await fetch(`/api/member/teams/${selectedTeam.id}/upload`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setSubmissionForm(prev => ({
          ...prev,
          materialsPath: data.filePath,
          materialsSize: data.fileSize
        }));
        alert('파일이 업로드되었습니다.');
      } else {
        const error = await response.json();
        alert(error.error || '파일 업로드 실패');
      }
    } catch (error) {
      console.error('파일 업로드 실패:', error);
      alert('파일 업로드 중 오류가 발생했습니다');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitContent = async () => {
    if (!selectedTeam) return;

    try {
      const response = await fetch(`/api/member/teams/${selectedTeam.id}/submission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionForm)
      });

      if (response.ok) {
        alert('제출물이 성공적으로 저장되었습니다.');
        setShowSubmissionModal(false);
        setSelectedTeam(null);
        setSubmissionForm({
          materialsPath: '',
          materialsSize: 0,
          contentTitle: '',
          contentBody: '',
          contentLinks: []
        });
        loadTeams();
      } else {
        const error = await response.json();
        alert(error.error || '제출 실패');
      }
    } catch (error) {
      console.error('제출 실패:', error);
      alert('제출 중 오류가 발생했습니다');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">로딩 중...</div>
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
          <div key={team.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{team.name}</h3>
                <p className="text-gray-600 mt-1">
                  {team.experienceCampaign.title} · {team.userRole === 'leader' ? '팀장' : '팀원'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  상태: {team.status === 'FORMING' ? '팀 구성 중' : team.status === 'ACTIVE' ? '활성' : team.status}
                </p>
              </div>
              <div className="flex gap-2">
                {team.userRole === 'leader' && team.status === 'FORMING' && (
                  <button
                    onClick={() => handleCompleteTeamFormation(team.id)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
                  >
                    팀 구성 완료
                  </button>
                )}
                {team.userRole === 'leader' && team.status === 'ACTIVE' && (
                  <button
                    onClick={() => {
                      setSelectedTeam(team);
                      setShowSubmissionModal(true);
                    }}
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
        ))
      )}
    </div>
  );
}

export default function ExperiencePage() {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'teams'>('campaigns');
  const [campaigns, setCampaigns] = useState<ExperienceCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [showTeamSelectionModal, setShowTeamSelectionModal] = useState(false);
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

  // 팀원 참여 신청
  const handleApplyAsMember = (campaign: ExperienceCampaign) => {
    setSelectedCampaign(campaign);
    setShowTeamSelectionModal(true);
  };

  // 팀 참여 신청 제출
  const handleApplyToTeam = async (teamId: string) => {
    if (!selectedCampaign) return;

    try {
      setApplying(true);
      const response = await fetch('/api/member/teams/apply-as-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId })
      });

      if (response.ok) {
        setShowTeamSelectionModal(false);
        setSelectedCampaign(null);
        loadCampaigns(); // 목록 새로고침
        alert('팀 참여 신청이 완료되었습니다. 팀장 승인을 기다려주세요.');
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
          <h1 className="text-3xl font-bold text-gray-900">체험단</h1>
          <p className="mt-2 text-gray-600">
            체험단 공고를 확인하고 팀을 관리하세요.
          </p>

          {/* 탭 */}
          <div className="mt-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('campaigns')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'campaigns'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                체험단 공고
              </button>
              <button
                onClick={() => setActiveTab('teams')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'teams'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                내 팀 관리
              </button>
            </nav>
          </div>
        </div>

        {/* 탭 컨텐츠 */}
        {activeTab === 'campaigns' && (
          <>
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
                  ) : campaign.userStatus === 'available' ? (
                    <span className="text-blue-600 font-medium">팀 참여 가능</span>
                  ) : (
                    <span>참여 조건을 확인하세요</span>
                  )}
                </div>

                <div className="flex gap-2">
                  {campaign.canApplyAsLeader && (
                    <button
                      onClick={() => handleApplyAsLeader(campaign)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      팀장 신청
                    </button>
                  )}
                  {campaign.userStatus === 'available' && campaign.teams && campaign.teams.length > 0 && (
                    <button
                      onClick={() => handleApplyAsMember(campaign)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                    >
                      팀 참여
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

            {campaigns.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 text-lg">현재 모집 중인 체험단 공고가 없습니다.</p>
              </div>
            )}
            </div>
          </>
        )}

        {activeTab === 'teams' && (
          <TeamManagementTab />

        {/* 자료 제출 모달 */}
        {showSubmissionModal && selectedTeam && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">자료 및 컨텐츠 제출</h2>
              <p className="text-gray-600 mb-6">
                <strong>{selectedTeam.name}</strong> 팀의 체험 결과를 제출합니다.
              </p>

              <div className="space-y-6">
                {/* 자료 업로드 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    체험 자료 (ZIP 파일, 최대 300MB)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    {submissionForm.materialsPath ? (
                      <div className="text-center">
                        <div className="text-green-600 font-medium">파일이 업로드되었습니다</div>
                        <div className="text-sm text-gray-500 mt-1">
                          크기: {(submissionForm.materialsSize / 1024 / 1024).toFixed(2)}MB
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <input
                          type="file"
                          accept=".zip"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file);
                          }}
                          disabled={uploading}
                          className="hidden"
                          id="file-upload"
                        />
                        <label
                          htmlFor="file-upload"
                          className="cursor-pointer text-blue-600 hover:text-blue-800"
                        >
                          {uploading ? '업로드 중...' : 'ZIP 파일을 선택하세요'}
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          최대 300MB까지 업로드 가능합니다
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 컨텐츠 제목 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    컨텐츠 제목 (선택사항)
                  </label>
                  <input
                    type="text"
                    value={submissionForm.contentTitle}
                    onChange={(e) => setSubmissionForm(prev => ({ ...prev, contentTitle: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="컨텐츠 제목을 입력하세요"
                  />
                </div>

                {/* 컨텐츠 본문 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    컨텐츠 본문 (선택사항)
                  </label>
                  <textarea
                    value={submissionForm.contentBody}
                    onChange={(e) => setSubmissionForm(prev => ({ ...prev, contentBody: e.target.value }))}
                    rows={6}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="체험 후기를 작성하세요"
                  />
                </div>

                {/* 관련 링크 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    관련 링크 (선택사항)
                  </label>
                  {submissionForm.contentLinks.map((link, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="url"
                        value={link}
                        onChange={(e) => {
                          const newLinks = [...submissionForm.contentLinks];
                          newLinks[index] = e.target.value;
                          setSubmissionForm(prev => ({ ...prev, contentLinks: newLinks }));
                        }}
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://..."
                      />
                      <button
                        onClick={() => {
                          const newLinks = submissionForm.contentLinks.filter((_, i) => i !== index);
                          setSubmissionForm(prev => ({ ...prev, contentLinks: newLinks }));
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setSubmissionForm(prev => ({
                      ...prev,
                      contentLinks: [...prev.contentLinks, '']
                    }))}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    + 링크 추가
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowSubmissionModal(false);
                    setSelectedTeam(null);
                    setSubmissionForm({
                      materialsPath: '',
                      materialsSize: 0,
                      contentTitle: '',
                      contentBody: '',
                      contentLinks: []
                    });
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={handleSubmitContent}
                  disabled={uploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  제출하기
                </button>
              </div>
            </div>
          </div>
        )}

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

        {/* 팀 선택 모달 */}
        {showTeamSelectionModal && selectedCampaign && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">팀 참여 신청</h2>
              <p className="text-gray-600 mb-4">
                <strong>{selectedCampaign.title}</strong> 체험단의 참여할 팀을 선택하세요.
              </p>

              <div className="space-y-3">
                {selectedCampaign.teams?.filter(team => team.status === 'FORMING').map((team) => (
                  <div key={team.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{team.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          팀장: {team.leaderId} · 현재 인원: {team._count.memberships}명
                        </p>
                        {team.description && (
                          <p className="text-sm text-gray-500 mt-2">{team.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleApplyToTeam(team.id)}
                        disabled={applying}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed ml-4"
                      >
                        {applying ? '신청 중...' : '참여 신청'}
                      </button>
                    </div>
                  </div>
                ))}
                {(!selectedCampaign.teams || selectedCampaign.teams.filter(team => team.status === 'FORMING').length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    현재 모집 중인 팀이 없습니다.
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowTeamSelectionModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
