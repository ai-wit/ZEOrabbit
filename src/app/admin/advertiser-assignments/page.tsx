'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AdvertiserManager {
  id: string;
  assignedAt: string;
  isActive: boolean;
  advertiser: {
    user: {
      name: string;
      email: string;
    };
  };
  manager: {
    name: string;
    email: string;
  };
  assignedByUser: {
    name: string;
  };
}

interface Advertiser {
  id: string;
  user: {
    name: string;
    email: string;
  };
}

interface Manager {
  id: string;
  name: string;
  email: string;
}

export default function AdvertiserAssignmentsPage() {
  const [assignments, setAssignments] = useState<AdvertiserManager[]>([]);
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAdvertiser, setSelectedAdvertiser] = useState('');
  const [selectedManager, setSelectedManager] = useState('');
  const [assigning, setAssigning] = useState(false);
  const router = useRouter();

  // 데이터 로드
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [assignmentsRes, advertisersRes, managersRes] = await Promise.all([
        fetch('/api/admin/advertiser-assignments'),
        fetch('/api/admin/advertisers'), // TODO: 광고주 목록 API 필요
        fetch('/api/admin/managers') // TODO: 매니저 목록 API 필요
      ]);

      if (assignmentsRes.ok) {
        const data = await assignmentsRes.json();
        setAssignments(data.assignments);
      }

      if (advertisersRes.ok) {
        setAdvertisers(await advertisersRes.json());
      }

      if (managersRes.ok) {
        setManagers(await managersRes.json());
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 광고주 배정
  const handleAssign = async () => {
    if (!selectedAdvertiser || !selectedManager) return;

    try {
      setAssigning(true);
      const response = await fetch('/api/admin/advertiser-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          advertiserId: selectedAdvertiser,
          managerId: selectedManager
        })
      });

      if (response.ok) {
        setShowAssignModal(false);
        setSelectedAdvertiser('');
        setSelectedManager('');
        loadData(); // 목록 새로고침
      } else {
        const error = await response.json();
        alert(error.error || '배정 실패');
      }
    } catch (error) {
      console.error('배정 실패:', error);
      alert('배정 중 오류가 발생했습니다');
    } finally {
      setAssigning(false);
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
          <h1 className="text-3xl font-bold text-gray-900">광고주-매니저 배정 관리</h1>
          <p className="mt-2 text-gray-600">
            Super 관리자가 광고주를 매니저에게 배정하고 관리합니다.
          </p>
        </div>

        {/* 배정 버튼 */}
        <div className="mb-6">
          <button
            onClick={() => setShowAssignModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            새 배정 추가
          </button>
        </div>

        {/* 배정 목록 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  광고주
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  매니저
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  배정일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  배정자
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {assignment.advertiser.user.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {assignment.advertiser.user.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {assignment.manager.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {assignment.manager.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(assignment.assignedAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {assignment.assignedByUser.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      assignment.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {assignment.isActive ? '활성' : '비활성'}
                    </span>
                  </td>
                </tr>
              ))}
              {assignments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    배정된 관계가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 배정 모달 */}
        {showAssignModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">광고주 배정</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    광고주 선택
                  </label>
                  <select
                    value={selectedAdvertiser}
                    onChange={(e) => setSelectedAdvertiser(e.target.value)}
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
                    매니저 선택
                  </label>
                  <select
                    value={selectedManager}
                    onChange={(e) => setSelectedManager(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">선택하세요</option>
                    {managers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.name} ({manager.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={assigning}
                >
                  취소
                </button>
                <button
                  onClick={handleAssign}
                  disabled={!selectedAdvertiser || !selectedManager || assigning}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {assigning ? '배정 중...' : '배정'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
