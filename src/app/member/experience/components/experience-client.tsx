'use client';

import React, { useState } from 'react';
import { Card, DividerList, EmptyState, Pill, Button } from "@/app/_ui/primitives";
import { getTeamStatusLabel } from '@/lib/status-labels';

// Components
import { LeaderApplicationModal } from './leader-application-modal';
import { TeamSelectionModal } from './team-selection-modal';
import { ContentSubmissionModal } from './content-submission-modal';
import { TeamManagementModal } from './team-management-modal';
import { CampaignDetailModal } from './campaign-detail-modal';
import { CampaignCard } from './campaign-card';

// Hooks
import { useExperienceCampaigns, useTeams } from '../hooks/use-experience-data';
import { useTeamApplication, useTeamManagement, useContentSubmission } from '../hooks/use-experience-actions';
import { useModalState } from '../hooks/use-modal-state';

export function ExperienceClient() {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'teams'>('campaigns');

  return (
    <div className="space-y-6">
      {/* 탭 */}
      <div className="border-b border-white/10">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`border-b-2 py-2 px-1 text-sm font-medium transition-colors ${
              activeTab === 'campaigns'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
            }`}
          >
            체험단 공고
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`border-b-2 py-2 px-1 text-sm font-medium transition-colors ${
              activeTab === 'teams'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
            }`}
          >
            내 팀 관리
          </button>
        </nav>
      </div>

      {/* 탭 컨텐츠 */}
      {activeTab === 'campaigns' && <CampaignsTab />}
      {activeTab === 'teams' && <TeamsTab />}
    </div>
  );
}

function CampaignsTab() {
  const { campaigns, loading, error, refetch } = useExperienceCampaigns();
  const { applying, applyAsLeader, applyAsMember } = useTeamApplication();
  const { showApplicationModal, showTeamSelectionModal, showCampaignDetailModal, selectedCampaign, closeApplicationModal, closeTeamSelectionModal, closeCampaignDetailModal, openApplicationModal, openTeamSelectionModal, openCampaignDetailModal } = useModalState();

  // 임시 디버깅용 상태
  const [debugModalOpen, setDebugModalOpen] = useState(false);
  const [debugCampaign, setDebugCampaign] = useState(null);

  const handleApplyAsLeader = (campaign: any) => {
    openApplicationModal(campaign);
  };

  const handleApplyAsMember = (campaign: any) => {
    openTeamSelectionModal(campaign);
  };

  const handleSubmitApplication = async (form: any) => {
    const result = await applyAsLeader(form);
    if (result.success) {
      refetch();
    }
    return result;
  };

  const handleApplyToTeam = async (teamId: string) => {
    const result = await applyAsMember(teamId);
    if (result.success) {
      refetch();
    }
    return result;
  };

  const handleCardClick = (campaign: any) => {
    openCampaignDetailModal(campaign);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg text-zinc-400">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 text-lg">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors"
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
            onApplyAsLeader={handleApplyAsLeader}
            onApplyAsMember={handleApplyAsMember}
            onCardClick={handleCardClick}
          />
        ))}

        {campaigns.length === 0 && (
          <div className="text-center py-12">
            <p className="text-zinc-500 text-lg">현재 모집 중인 체험단 공고가 없습니다.</p>
          </div>
        )}
      </div>

      {/* 모달들 */}
      <LeaderApplicationModal
        isOpen={showApplicationModal}
        campaign={selectedCampaign}
        onClose={closeApplicationModal}
        onSubmit={handleSubmitApplication}
        applying={applying}
      />

      <TeamSelectionModal
        isOpen={showTeamSelectionModal}
        campaign={selectedCampaign}
        onClose={closeTeamSelectionModal}
        onApplyToTeam={handleApplyToTeam}
        applying={applying}
      />

      <CampaignDetailModal
        isOpen={showCampaignDetailModal}
        campaign={selectedCampaign}
        onClose={closeCampaignDetailModal}
        onApplyAsLeader={handleApplyAsLeader}
        onApplyAsMember={handleApplyAsMember}
        onApplyToTeam={handleApplyToTeam}
      />
    </>
  );
}

function TeamsTab() {
  const { teams, loading, error, refetch } = useTeams();
  const { completeTeamFormation, decideMembership } = useTeamManagement();
  const { showSubmissionModal, showTeamManagementModal, selectedTeam, closeSubmissionModal, closeTeamManagementModal, openSubmissionModal, openTeamManagementModal } = useModalState();
  const { uploading, submitting, uploadFile, submitContent } = useContentSubmission();

  const handleCompleteFormation = async (teamId: string) => {
    const result = await completeTeamFormation(teamId);
    if (result.success) {
      refetch();
    } else {
      alert(result.error);
    }
  };

  const handleDecideMembership = async (membershipId: string, action: 'approve' | 'reject', reason?: string) => {
    const result = await decideMembership(selectedTeam!.id, membershipId, action, reason);
    return result;
  };

  const handleOpenTeamManagement = (team: any) => {
    openTeamManagementModal(team);
  };

  const handleUploadFile = async (teamId: string, file: File) => {
    return await uploadFile(teamId, file);
  };

  const handleSubmitContent = async (teamId: string, form: any) => {
    const result = await submitContent(teamId, form);
    return result;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg text-zinc-400">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 text-lg">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <>
      <Card>
        <div className="border-b border-white/10 px-6 py-4 text-sm text-zinc-300">
          내 팀 {teams.length}개
        </div>
        <DividerList>
          {teams.length === 0 ? (
            <EmptyState title="참여 중인 팀이 없습니다." description="체험단 공고에서 팀을 만들거나 참여해보세요." />
          ) : (
            teams.map((team) => (
              <div key={team.id} className="px-6 py-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-zinc-50">{team.name}</div>
                      <Pill tone={team.userRole === 'leader' ? 'cyan' : 'indigo'}>
                        {team.userRole === 'leader' ? '팀장' : '팀원'}
                      </Pill>
                      <Pill tone={team.status === 'ACTIVE' ? 'emerald' : 'neutral'}>
                        {getTeamStatusLabel(team.status)}
                      </Pill>
                    </div>
                    <div className="text-xs text-zinc-400">{team.experienceCampaign.title}</div>
                    <div className="text-xs text-zinc-500">
                      팀원 {team.memberships?.length || 0}명 / 최대 {team.experienceCampaign.maxMembersPerTeam}명 · {' '}
                      {new Date(team.experienceCampaign.startDate).toLocaleDateString('ko-KR')} ~ {' '}
                      {new Date(team.experienceCampaign.endDate).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {team.userRole === 'leader' && team.status === 'FORMING' && (
                      <Button
                        onClick={() => handleCompleteFormation(team.id)}
                        variant="primary"
                        size="sm"
                      >
                        팀 구성 완료
                      </Button>
                    )}
                    {team.userRole === 'leader' && team.status === 'ACTIVE' && (
                      <Button
                        onClick={() => openSubmissionModal(team)}
                        variant="secondary"
                        size="sm"
                      >
                        자료 제출
                      </Button>
                    )}
                    <Button
                      onClick={() => handleOpenTeamManagement(team)}
                      variant="secondary"
                      size="sm"
                    >
                      팀 관리
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </DividerList>
      </Card>

      {/* 모달들 */}
      <TeamManagementModal
        isOpen={showTeamManagementModal}
        team={selectedTeam}
        onClose={closeTeamManagementModal}
        onDecideMembership={handleDecideMembership}
      />

      <ContentSubmissionModal
        isOpen={showSubmissionModal}
        team={selectedTeam}
        onClose={closeSubmissionModal}
        onUploadFile={handleUploadFile}
        onSubmitContent={handleSubmitContent}
        uploading={uploading}
        submitting={submitting}
      />
    </>
  );
}

