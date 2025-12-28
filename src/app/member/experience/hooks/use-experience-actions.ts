import { useState } from 'react';
import type { TeamApplicationForm, SubmissionForm, Team } from '../types';

export function useTeamApplication() {
  const [applying, setApplying] = useState(false);

  const applyAsLeader = async (form: TeamApplicationForm) => {
    try {
      setApplying(true);
      const response = await fetch('/api/member/experience-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '팀장 신청 실패');
      }

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '팀장 신청 중 오류가 발생했습니다';
      return { success: false, error: errorMessage };
    } finally {
      setApplying(false);
    }
  };

  const applyAsMember = async (teamId: string) => {
    try {
      setApplying(true);
      const response = await fetch('/api/member/teams/apply-as-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '팀 참여 신청 실패');
      }

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '팀 참여 신청 중 오류가 발생했습니다';
      return { success: false, error: errorMessage };
    } finally {
      setApplying(false);
    }
  };

  return {
    applying,
    applyAsLeader,
    applyAsMember
  };
}

export function useTeamManagement() {
  const [loading, setLoading] = useState(false);

  const completeTeamFormation = async (teamId: string) => {
    if (!confirm('팀 구성을 완료하시겠습니까? 완료 후에는 팀원을 추가할 수 없습니다.')) {
      return { success: false };
    }

    try {
      setLoading(true);
      const response = await fetch('/api/member/teams/complete-formation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '팀 구성 완료 실패');
      }

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '팀 구성 완료 중 오류가 발생했습니다';
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const decideMembership = async (teamId: string, membershipId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      setLoading(true);
      const payload = {
        membershipId,
        action,
        ...(reason !== undefined && { reason })
      };

      const response = await fetch(`/api/member/teams/${teamId}/memberships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '멤버십 결정 실패');
      }

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '멤버십 결정 중 오류가 발생했습니다';
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    completeTeamFormation,
    decideMembership
  };
}

export function useContentSubmission() {
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const uploadFile = async (teamId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      const response = await fetch(`/api/member/teams/${teamId}/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '파일 업로드 실패');
      }

      const data = await response.json();
      return { success: true, data };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '파일 업로드 중 오류가 발생했습니다';
      return { success: false, error: errorMessage };
    } finally {
      setUploading(false);
    }
  };

  const submitContent = async (teamId: string, form: SubmissionForm) => {
    try {
      setSubmitting(true);
      const response = await fetch(`/api/member/teams/${teamId}/submission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '제출 실패');
      }

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '제출 중 오류가 발생했습니다';
      return { success: false, error: errorMessage };
    } finally {
      setSubmitting(false);
    }
  };

  return {
    uploading,
    submitting,
    uploadFile,
    submitContent
  };
}
