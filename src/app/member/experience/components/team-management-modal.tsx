import { useState, useEffect } from 'react';
import type { Team, TeamMembership } from '../types';

interface InvitationCode {
  id: string;
  code: string;
  maxUses: number;
  currentUses: number;
  isActive: boolean;
  expiresAt: string;
  createdAt: string;
  createdByName: string;
  inviteUrl: string;
}

interface TeamManagementModalProps {
  isOpen: boolean;
  team: Team | null;
  onClose: () => void;
  onDecideMembership: (membershipId: string, action: 'approve' | 'reject', reason?: string) => Promise<{ success: boolean; error?: string }>;
}

export function TeamManagementModal({
  isOpen,
  team,
  onClose,
  onDecideMembership
}: TeamManagementModalProps) {
  const [memberships, setMemberships] = useState<TeamMembership[]>([]);
  const [invitationCodes, setInvitationCodes] = useState<InvitationCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [showCreateInvitation, setShowCreateInvitation] = useState(false);
  const [invitationForm, setInvitationForm] = useState({
    maxUses: 1,
    expiresInHours: 24
  });

  useEffect(() => {
    if (isOpen && team) {
      fetchMemberships();
    }
  }, [isOpen, team]);

  const fetchMemberships = async () => {
    if (!team) return;

    try {
      setLoading(true);
      const [membershipsResponse, invitationsResponse] = await Promise.all([
        fetch(`/api/member/teams/${team.id}/memberships`),
        fetch(`/api/member/teams/${team.id}/invitations`)
      ]);

      if (membershipsResponse.ok) {
        const data = await membershipsResponse.json();
        setMemberships(data.memberships);
      }

      if (invitationsResponse.ok) {
        const data = await invitationsResponse.json();
        setInvitationCodes(data.invitationCodes);
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDecideMembership = async (membershipId: string, action: 'approve' | 'reject') => {
    if (!confirm(action === 'approve' ? '이 회원을 팀원으로 승인하시겠습니까?' : '이 회원의 신청을 거절하시겠습니까?')) {
      return;
    }

    const reason = action === 'reject' ? prompt('거절 사유를 입력하세요:') || undefined : undefined;
    if (action === 'reject' && !reason) {
      return; // 거절 시 사유 필수
    }

    try {
      setProcessing(membershipId);
      const result = await onDecideMembership(membershipId, action, reason);
      if (result.success) {
        await fetchMemberships(); // 목록 새로고침
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert('처리 중 오류가 발생했습니다');
    } finally {
      setProcessing(null);
    }
  };

  const handleRemoveMember = async (membershipId: string, memberName: string) => {
    if (!confirm(`${memberName}님을 팀에서 추방하시겠습니까?`)) {
      return;
    }

    try {
      setProcessing(membershipId);
      const response = await fetch(`/api/member/teams/${team!.id}/memberships?membershipId=${membershipId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('팀원 추방이 완료되었습니다');
        await fetchMemberships(); // 목록 새로고침
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      alert('팀원 추방 중 오류가 발생했습니다');
    } finally {
      setProcessing(null);
    }
  };

  const handleCreateInvitation = async () => {
    if (!team) return;

    try {
      setProcessing('create-invitation');
      const response = await fetch(`/api/member/teams/${team.id}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invitationForm)
      });

      if (response.ok) {
        const data = await response.json();
        alert(`초대코드가 생성되었습니다!\n코드: ${data.invitationCode.code}\n링크: ${data.invitationCode.inviteUrl}`);
        setInvitationForm({ maxUses: 1, expiresInHours: 24 });
        setShowCreateInvitation(false);
        await fetchMemberships(); // 목록 새로고침
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      alert('초대코드 생성 중 오류가 발생했습니다');
    } finally {
      setProcessing(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('클립보드에 복사되었습니다');
  };

  if (!isOpen || !team) return null;

  const pendingMemberships = memberships.filter(m => m.status === 'PENDING');
  const approvedMemberships = memberships.filter(m => m.status === 'APPROVED');
  const rejectedMemberships = memberships.filter(m => m.status === 'REJECTED');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-zinc-50 mb-4">팀 관리 - {team.name}</h2>

        {loading ? (
          <div className="text-center py-8 text-zinc-400">로딩 중...</div>
        ) : (
          <div className="space-y-6">
            {/* 초대코드 관리 */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-zinc-50">초대코드 관리</h3>
                <button
                  onClick={() => setShowCreateInvitation(!showCreateInvitation)}
                  className="bg-cyan-600 text-white px-3 py-1 rounded text-sm hover:bg-cyan-700"
                >
                  {showCreateInvitation ? '취소' : '새 코드 생성'}
                </button>
              </div>

              {showCreateInvitation && (
                <div className="border border-cyan-400/40 rounded-lg p-4 bg-cyan-400/5 mb-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-50 mb-1">
                        최대 사용 횟수
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={invitationForm.maxUses}
                        onChange={(e) => setInvitationForm(prev => ({ ...prev, maxUses: parseInt(e.target.value) }))}
                        className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-zinc-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-50 mb-1">
                        만료 시간 (시간)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="168"
                        value={invitationForm.expiresInHours}
                        onChange={(e) => setInvitationForm(prev => ({ ...prev, expiresInHours: parseInt(e.target.value) }))}
                        className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-zinc-50"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleCreateInvitation}
                    disabled={processing === 'create-invitation'}
                    className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {processing === 'create-invitation' ? '생성 중...' : '초대코드 생성'}
                  </button>
                </div>
              )}

              {invitationCodes.length > 0 && (
                <div className="space-y-3">
                  {invitationCodes.map((code) => (
                    <div key={code.id} className="border border-zinc-600 rounded-lg p-4 bg-zinc-800/50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <code className="bg-zinc-700 px-2 py-1 rounded text-sm font-mono text-cyan-400">
                              {code.code}
                            </code>
                            <span className={`px-2 py-1 rounded text-xs ${
                              code.isActive ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                            }`}>
                              {code.isActive ? '활성' : '비활성'}
                            </span>
                          </div>
                          <div className="text-sm text-zinc-400 space-y-1">
                            <p>사용: {code.currentUses}/{code.maxUses}</p>
                            <p>만료: {new Date(code.expiresAt).toLocaleString('ko-KR')}</p>
                            <p>생성: {code.createdByName} ({new Date(code.createdAt).toLocaleDateString('ko-KR')})</p>
                          </div>
                        </div>
                        <button
                          onClick={() => copyToClipboard(code.inviteUrl)}
                          className="bg-zinc-600 text-white px-3 py-1 rounded text-sm hover:bg-zinc-700 ml-4"
                        >
                          링크 복사
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {invitationCodes.length === 0 && !showCreateInvitation && (
                <div className="text-center py-4 text-zinc-500">
                  아직 생성된 초대코드가 없습니다.
                </div>
              )}
            </div>

            {/* 승인 대기 중인 신청들 */}
            {pendingMemberships.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-zinc-50 mb-3">승인 대기 중 ({pendingMemberships.length})</h3>
                <div className="space-y-3">
                  {pendingMemberships.map((membership) => (
                    <div key={membership.id} className="border border-yellow-400/40 rounded-lg p-4 bg-yellow-400/5">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-zinc-50">{membership.member.name}</p>
                          <p className="text-sm text-zinc-400">{membership.member.email}</p>
                          <p className="text-xs text-zinc-500">
                            신청일: {new Date(membership.appliedAt).toLocaleDateString('ko-KR')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDecideMembership(membership.id, 'approve')}
                            disabled={processing === membership.id}
                            className="bg-emerald-600 text-white px-3 py-1 rounded text-sm hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {processing === membership.id ? '처리 중...' : '승인'}
                          </button>
                          <button
                            onClick={() => handleDecideMembership(membership.id, 'reject')}
                            disabled={processing === membership.id}
                            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:opacity-50"
                          >
                            {processing === membership.id ? '처리 중...' : '거절'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 승인된 팀원들 */}
            {approvedMemberships.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-zinc-50 mb-3">팀원 ({approvedMemberships.length})</h3>
                <div className="space-y-3">
                  {approvedMemberships.map((membership) => (
                    <div key={membership.id} className="border border-emerald-400/40 rounded-lg p-4 bg-emerald-400/5">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-zinc-50">{membership.member.name}</p>
                          <p className="text-sm text-zinc-400">{membership.member.email}</p>
                          <p className="text-xs text-zinc-500">
                            승인일: {new Date(membership.decidedAt!).toLocaleDateString('ko-KR')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-emerald-400">승인됨</span>
                          {team?.status === 'FORMING' && (
                            <button
                              onClick={() => handleRemoveMember(membership.id, membership.member.name)}
                              disabled={processing === membership.id}
                              className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 disabled:opacity-50"
                            >
                              {processing === membership.id ? '처리 중...' : '추방'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 거절된 신청들 */}
            {rejectedMemberships.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-zinc-50 mb-3">거절된 신청 ({rejectedMemberships.length})</h3>
                <div className="space-y-3">
                  {rejectedMemberships.map((membership) => (
                    <div key={membership.id} className="border border-red-400/40 rounded-lg p-4 bg-red-400/5">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-zinc-50">{membership.member.name}</p>
                          <p className="text-sm text-zinc-400">{membership.member.email}</p>
                          <p className="text-xs text-zinc-500">
                            거절일: {new Date(membership.decidedAt!).toLocaleDateString('ko-KR')}
                          </p>
                          {membership.failureReason && (
                            <p className="text-xs text-red-400 mt-1">
                              사유: {membership.failureReason}
                            </p>
                          )}
                        </div>
                        <div className="text-sm text-red-400">
                          거절됨
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {memberships.length === 0 && (
              <div className="text-center py-8 text-zinc-500">
                아직 팀원이 없습니다.
              </div>
            )}
          </div>
        )}

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
