import { useState, useEffect } from 'react';
import type { ExperienceCampaign, Team, CampaignsResponse, TeamsResponse } from '../types';

export function useExperienceCampaigns() {
  const [campaigns, setCampaigns] = useState<ExperienceCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/member/experience-campaigns');

      if (!response.ok) {
        throw new Error('공고 목록을 불러오는데 실패했습니다');
      }

      const data: CampaignsResponse = await response.json();
      setCampaigns(data.campaigns);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다';
      setError(errorMessage);
      console.error('공고 목록 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  return {
    campaigns,
    loading,
    error,
    refetch: loadCampaigns
  };
}

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTeams = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/member/teams');

      if (!response.ok) {
        throw new Error('팀 목록을 불러오는데 실패했습니다');
      }

      const data: TeamsResponse = await response.json();
      setTeams(data.teams);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다';
      setError(errorMessage);
      console.error('팀 목록 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  return {
    teams,
    loading,
    error,
    refetch: loadTeams
  };
}
