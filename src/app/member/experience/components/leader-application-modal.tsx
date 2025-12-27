import { useState } from 'react';
import type { ExperienceCampaign, TeamApplicationForm } from '../types';

interface LeaderApplicationModalProps {
  isOpen: boolean;
  campaign: ExperienceCampaign | null;
  onClose: () => void;
  onSubmit: (form: TeamApplicationForm) => Promise<{ success: boolean; error?: string }>;
  applying: boolean;
}

export function LeaderApplicationModal({
  isOpen,
  campaign,
  onClose,
  onSubmit,
  applying
}: LeaderApplicationModalProps) {
  const [form, setForm] = useState<TeamApplicationForm>({
    campaignId: '',
    teamName: '',
    teamDescription: ''
  });

  const handleSubmit = async () => {
    if (!form.teamName.trim() || !campaign) return;

    const result = await onSubmit({
      ...form,
      campaignId: campaign.id
    });

    if (result.success) {
      onClose();
      setForm({ campaignId: '', teamName: '', teamDescription: '' });
    } else {
      alert(result.error);
    }
  };

  const handleClose = () => {
    if (!applying) {
      onClose();
      setForm({ campaignId: '', teamName: '', teamDescription: '' });
    }
  };

  if (!isOpen || !campaign) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#18181b',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '24px',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 'bold',
          color: '#fafafa',
          marginBottom: '16px'
        }}>팀장 신청</h2>
        <p style={{
          color: '#a1a1aa',
          marginBottom: '16px'
        }}>
          <strong className="text-zinc-50">{campaign.title}</strong> 체험단의 팀장으로 신청합니다.
        </p>

        <div className="space-y-4">
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#d4d4d8',
              marginBottom: '8px'
            }}>
              팀 이름
            </label>
            <input
              type="text"
              value={form.teamName}
              onChange={(e) => setForm(prev => ({ ...prev, teamName: e.target.value }))}
              style={{
                width: '100%',
                backgroundColor: 'rgba(39, 39, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#f4f4f5',
                outline: 'none'
              }}
              placeholder="팀 이름을 입력하세요"
              disabled={applying}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#d4d4d8',
              marginBottom: '8px'
            }}>
              팀 설명 (선택사항)
            </label>
            <textarea
              value={form.teamDescription}
              onChange={(e) => setForm(prev => ({ ...prev, teamDescription: e.target.value }))}
              rows={3}
              style={{
                width: '100%',
                backgroundColor: 'rgba(39, 39, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#f4f4f5',
                outline: 'none',
                resize: 'none'
              }}
              placeholder="팀에 대한 간단한 설명을 입력하세요"
              disabled={applying}
            />
          </div>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          marginTop: '24px'
        }}>
          <button
            onClick={handleClose}
            style={{
              padding: '8px 16px',
              color: '#a1a1aa',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              cursor: applying ? 'not-allowed' : 'pointer'
            }}
            disabled={applying}
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.teamName.trim() || applying}
            style={{
              padding: '8px 16px',
              backgroundColor: applying || !form.teamName.trim() ? '#374151' : '#0891b2',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: applying || !form.teamName.trim() ? 'not-allowed' : 'pointer',
              opacity: applying || !form.teamName.trim() ? 0.5 : 1
            }}
          >
            {applying ? '신청 중...' : '신청하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
