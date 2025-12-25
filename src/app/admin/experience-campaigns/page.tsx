'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ExperienceCampaign {
  id: string;
  title: string;
  status: string;
  targetTeamCount: number;
  maxMembersPerTeam: number;
  applicationDeadline: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  advertiser: {
    user: {
      name: string;
    };
  };
  place: {
    name: string;
  };
  _count: {
    teams: number;
  };
}

interface Advertiser {
  id: string;
  user: {
    name: string;
    email: string;
  };
  places: Array<{
    id: string;
    name: string;
  }>;
}

export default function ExperienceCampaignsPage() {
  const [campaigns, setCampaigns] = useState<ExperienceCampaign[]>([]);
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    advertiserId: '',
    placeId: '',
    title: '',
    description: '',
    targetTeamCount: 1,
    maxMembersPerTeam: 5,
    applicationDeadline: '',
    startDate: '',
    endDate: ''
  });
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  // 데이터 로드
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [campaignsRes, advertisersRes] = await Promise.all([
        fetch('/api/admin/experience-campaigns'),
        fetch('/api/admin/advertisers-with-places') // TODO: 광고주+장소 목록 API 필요
      ]);

      if (campaignsRes.ok) {
        const data = await campaignsRes.json();
        setCampaigns(data.campaigns);
      }

      if (advertisersRes.ok) {
        setAdvertisers(await advertisersRes.json());
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 폼 데이터 변경
  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // 광고주 변경 시 장소 초기화
    if (field === 'advertiserId') {
      setFormData(prev => ({ ...prev, placeId: '' }));
    }
  };

  // 공고 생성
  const handleCreate = async () => {
    try {
      setCreating(true);
      const response = await fetch('/api/admin/experience-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowCreateModal(false);
        setFormData({
          advertiserId: '',
          placeId: '',
          title: '',
          description: '',
          targetTeamCount: 1,
          maxMembersPerTeam: 5,
          applicationDeadline: '',
          startDate: '',
          endDate: ''
        });
        loadData(); // 목록 새로고침
      } else {
        const error = await response.json();
        alert(error.error || '공고 생성 실패');
      }
    } catch (error) {
      console.error('공고 생성 실패:', error);
      alert('공고 생성 중 오류가 발생했습니다');
    } finally {
      setCreating(false);
    }
  };

  // 선택된 광고주의 장소들
  const selectedAdvertiser = advertisers.find(a => a.id === formData.advertiserId);
  const availablePlaces = selectedAdvertiser?.places || [];

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
          <h1 className="text-3xl font-bold text-gray-900">체험단 공고 관리</h1>
          <p className="mt-2 text-gray-600">
            체험단 모집 공고를 생성하고 관리합니다.
          </p>
        </div>

        {/* 생성 버튼 */}
        <div className="mb-6">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            새 공고 생성
          </button>
        </div>

        {/* 공고 목록 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  공고명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  광고주
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  장소
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  팀 현황
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  모집기간
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {campaign.title}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {campaign.advertiser.user.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {campaign.place.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {campaign._count.teams} / {campaign.targetTeamCount}팀
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(campaign.applicationDeadline).toLocaleDateString('ko-KR')}까지
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      campaign.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800'
                        : campaign.status === 'DRAFT'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {campaign.status === 'ACTIVE' ? '활성' :
                       campaign.status === 'DRAFT' ? '초안' : '종료'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => router.push(`/admin/experience-campaigns/${campaign.id}`)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      상세
                    </button>
                  </td>
                </tr>
              ))}
              {campaigns.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    생성된 공고가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 생성 모달 */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">체험단 공고 생성</h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      광고주 선택
                    </label>
                    <select
                      value={formData.advertiserId}
                      onChange={(e) => handleInputChange('advertiserId', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">선택하세요</option>
                      {advertisers.map((advertiser) => (
                        <option key={advertiser.id} value={advertiser.id}>
                          {advertiser.user.name} ({advertiser.user.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      장소 선택
                    </label>
                    <select
                      value={formData.placeId}
                      onChange={(e) => handleInputChange('placeId', e.target.value)}
                      disabled={!formData.advertiserId}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    >
                      <option value="">선택하세요</option>
                      {availablePlaces.map((place) => (
                        <option key={place.id} value={place.id}>
                          {place.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    공고 제목
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="체험단 모집 공고 제목"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    공고 설명
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="체험단에 대한 상세 설명"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      목표 팀 수
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={formData.targetTeamCount}
                      onChange={(e) => handleInputChange('targetTeamCount', parseInt(e.target.value))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      팀당 최대 인원
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="10"
                      value={formData.maxMembersPerTeam}
                      onChange={(e) => handleInputChange('maxMembersPerTeam', parseInt(e.target.value))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      신청 마감일
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.applicationDeadline}
                      onChange={(e) => handleInputChange('applicationDeadline', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      체험 시작일
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      체험 종료일
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={creating}
                >
                  취소
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !formData.advertiserId || !formData.placeId || !formData.title}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? '생성 중...' : '생성'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
