import React, { useState } from 'react';
import type { ExperienceCampaign, Team, SubmissionForm } from '../types';

export function useModalState() {
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [showTeamSelectionModal, setShowTeamSelectionModal] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [showTeamManagementModal, setShowTeamManagementModal] = useState(false);
  const [showCampaignDetailModal, setShowCampaignDetailModal] = useState(false);

  const [selectedCampaign, setSelectedCampaign] = useState<ExperienceCampaign | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);


  const openApplicationModal = (campaign: ExperienceCampaign) => {
    setSelectedCampaign(campaign);
    setShowApplicationModal(true);
  };

  const closeApplicationModal = () => {
    setShowApplicationModal(false);
    setSelectedCampaign(null);
  };

  const openTeamSelectionModal = (campaign: ExperienceCampaign) => {
    setSelectedCampaign(campaign);
    setShowTeamSelectionModal(true);
  };

  const closeTeamSelectionModal = () => {
    setShowTeamSelectionModal(false);
    setSelectedCampaign(null);
  };

  const openSubmissionModal = (team: Team) => {
    setSelectedTeam(team);
    setShowSubmissionModal(true);
  };

  const closeSubmissionModal = () => {
    setShowSubmissionModal(false);
    setSelectedTeam(null);
  };

  const openTeamManagementModal = (team: Team) => {
    setSelectedTeam(team);
    setShowTeamManagementModal(true);
  };

  const closeTeamManagementModal = () => {
    setShowTeamManagementModal(false);
    setSelectedTeam(null);
  };

  const openCampaignDetailModal = (campaign: ExperienceCampaign) => {
    setSelectedCampaign(campaign);
    setShowCampaignDetailModal(true);
  };

  const closeCampaignDetailModal = () => {
    setShowCampaignDetailModal(false);
    setSelectedCampaign(null);
  };

  return {
    // Modal states
    showApplicationModal,
    showTeamSelectionModal,
    showSubmissionModal,
    showTeamManagementModal,
    showCampaignDetailModal,

    // Selected items
    selectedCampaign,
    selectedTeam,

    // Actions
    openApplicationModal,
    closeApplicationModal,
    openTeamSelectionModal,
    closeTeamSelectionModal,
    openSubmissionModal,
    closeSubmissionModal,
    openTeamManagementModal,
    closeTeamManagementModal,
    openCampaignDetailModal,
    closeCampaignDetailModal,
  };
}
