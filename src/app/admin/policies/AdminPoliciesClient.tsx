'use client';

import React, { useState } from "react";
import { PageShell } from "@/app/_ui/shell";
import { Button, Card, CardBody, Input, KeyValueRow, Label } from "@/app/_ui/primitives";
import { AdminHeader } from "../_components/AdminHeader";

function formatMs(ms: number): string {
  const minutes = Math.floor(ms / (1000 * 60));
  return `${minutes}분`;
}

function formatPercentage(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

interface MissionLimitsPayload {
  timeoutMsByMissionType: Record<string, number>;
}

interface PricingPayload {
  rewardRatioByMissionType: Record<string, number>;
  unitPriceMinKrwByMissionType: Record<string, number>;
  unitPriceMaxKrwByMissionType: Record<string, number>;
}

interface PayoutPayload {
  minPayoutKrw: number;
}

interface PolicyData {
  missionLimits: any;
  pricing: any;
  payout: any;
}

interface AdminPoliciesClientProps {
  initialData: PolicyData;
  userRole: "SUPER" | "MANAGER" | null;
}

export function AdminPoliciesClient({ initialData, userRole }: AdminPoliciesClientProps) {
  const [data, setData] = useState(initialData);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleEdit = (key: string) => {
    setEditing(key);
  };

  const handleCancel = () => {
    setEditing(null);
  };

  const handleSave = async (key: string, payload: MissionLimitsPayload | PricingPayload | PayoutPayload) => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, payload })
      });

      if (response.ok) {
        const result = await response.json();
        // 데이터 업데이트
        if (key === 'MISSION_LIMITS') {
          setData(prev => ({ ...prev, missionLimits: result.policy.payloadJson }));
        } else if (key === 'PRICING') {
          setData(prev => ({ ...prev, pricing: result.policy.payloadJson }));
        } else if (key === 'PAYOUT') {
          setData(prev => ({ ...prev, payout: result.policy.payloadJson }));
        }
        setEditing(null);
        alert('정책이 성공적으로 업데이트되었습니다.');
      } else {
        alert('정책 업데이트에 실패했습니다.');
      }
    } catch (error) {
      alert('오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (userRole === "MANAGER") {
    return (
      <PageShell
        header={
          <AdminHeader
            title="시스템 정책"
            description="슈퍼관리자만 접근할 수 있습니다."
          />
        }
      >
        <Card>
          <CardBody>
            <div className="text-sm text-zinc-400">슈퍼관리자만 정책을 설정할 수 있습니다.</div>
          </CardBody>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      header={
        <AdminHeader
          title="시스템 정책"
          description="플랫폼 운영 정책을 설정하고 관리합니다."
        />
      }
    >
      <div className="space-y-6">
        <Card>
          <CardBody className="space-y-4">
            <div className="text-sm font-semibold text-zinc-50">미션 제한 정책</div>
            <div className="text-sm text-zinc-300">
              각 미션 타입별 제한시간을 설정합니다.
            </div>

            <MissionLimitsForm
              currentData={data.missionLimits}
              onSave={(payload) => handleSave('MISSION_LIMITS', payload)}
              onEdit={() => handleEdit('MISSION_LIMITS')}
              onCancel={handleCancel}
              editing={editing === 'MISSION_LIMITS'}
              saving={saving}
            />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <div className="text-sm font-semibold text-zinc-50">가격 정책</div>
            <div className="text-sm text-zinc-300">
              각 미션 타입별 리워드 비율과 가격 범위를 설정합니다.
            </div>

            <PricingForm
              currentData={data.pricing}
              onSave={(payload) => handleSave('PRICING', payload)}
              onEdit={() => handleEdit('PRICING')}
              onCancel={handleCancel}
              editing={editing === 'PRICING'}
              saving={saving}
            />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <div className="text-sm font-semibold text-zinc-50">출금 정책</div>
            <div className="text-sm text-zinc-300">
              출금 요청 시 최소 금액을 설정합니다.
            </div>

            <PayoutForm
              currentData={data.payout}
              onSave={(payload) => handleSave('PAYOUT', payload)}
              onEdit={() => handleEdit('PAYOUT')}
              onCancel={handleCancel}
              editing={editing === 'PAYOUT'}
              saving={saving}
            />
          </CardBody>
        </Card>
      </div>
    </PageShell>
  );
}

// 폼 컴포넌트들
function MissionLimitsForm({
  currentData,
  onSave,
  onEdit,
  onCancel,
  editing,
  saving
}: {
  currentData: any;
  onSave: (payload: MissionLimitsPayload) => void;
  onEdit: () => void;
  onCancel: () => void;
  editing: boolean;
  saving: boolean;
}) {
  // 밀리초를 분으로 변환하여 초기값 설정
  const getInitialData = () => {
    if (currentData?.timeoutMsByMissionType) {
      return Object.fromEntries(
        Object.entries(currentData.timeoutMsByMissionType).map(([type, ms]) => [
          type,
          Math.floor((ms as number) / (1000 * 60))
        ])
      );
    }
    return { TRAFFIC: 3, SAVE: 5, SHARE: 2 };
  };

  const [formData, setFormData] = useState(getInitialData());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 분을 다시 밀리초로 변환하여 저장
    const timeoutMsByMissionType = Object.fromEntries(
      Object.entries(formData).map(([type, minutes]) => [
        type,
        (minutes as number) * 60 * 1000
      ])
    );
    onSave({ timeoutMsByMissionType });
  };

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900/50 rounded-lg p-4">
        <div className="text-sm font-medium text-zinc-200 mb-3">미션 제한시간 설정</div>
        <div className="grid gap-4 sm:grid-cols-3">
          {Object.entries(formData).map(([type, minutes]) => (
            <div key={type} className="space-y-2">
              <Label htmlFor={type}>{type} 제한시간</Label>
              <div className="flex items-center gap-2">
                <Input
                  id={type}
                  type="number"
                  value={minutes as number}
                  onChange={(e) => setFormData(prev => ({ ...prev, [type]: parseInt(e.target.value) }))}
                  disabled={!editing}
                  min="1"
                  max="1440"
                  className="flex-1"
                />
                <span className="text-sm text-zinc-400">분</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        {editing ? (
          <>
            <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
              취소
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={saving} onClick={handleSubmit}>
              {saving ? '저장 중...' : '저장'}
            </Button>
          </>
        ) : (
          <Button type="button" variant="secondary" size="sm" onClick={onEdit}>
            수정
          </Button>
        )}
      </div>
    </div>
  );
}

function PricingForm({
  currentData,
  onSave,
  onEdit,
  onCancel,
  editing,
  saving
}: {
  currentData: any;
  onSave: (payload: PricingPayload) => void;
  onEdit: () => void;
  onCancel: () => void;
  editing: boolean;
  saving: boolean;
}) {
  const [formData, setFormData] = useState<PricingPayload>(currentData || {
    rewardRatioByMissionType: { TRAFFIC: 0.1, SAVE: 0.15, SHARE: 0.05 },
    unitPriceMinKrwByMissionType: { TRAFFIC: 1000, SAVE: 1500, SHARE: 500 },
    unitPriceMaxKrwByMissionType: { TRAFFIC: 5000, SAVE: 10000, SHARE: 3000 }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900/50 rounded-lg p-4">
        <div className="text-sm font-medium text-zinc-200 mb-3">리워드 비율 (0.0 - 1.0)</div>
        <div className="grid gap-4 sm:grid-cols-3">
          {Object.entries(formData.rewardRatioByMissionType).map(([type, ratio]) => (
            <div key={type}>
              <Label htmlFor={`ratio-${type}`}>{type} 비율</Label>
              <Input
                id={`ratio-${type}`}
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={ratio as number}
                disabled={!editing}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  rewardRatioByMissionType: {
                    ...prev.rewardRatioByMissionType,
                    [type]: parseFloat(e.target.value)
                  }
                }))}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900/50 rounded-lg p-4">
        <div className="text-sm font-medium text-zinc-200 mb-3">가격 범위</div>
        <div className="space-y-4">
          {Object.keys(formData.rewardRatioByMissionType).map((type) => (
            <div key={type} className="border-b border-zinc-800 pb-3 last:border-b-0 last:pb-0">
              <div className="text-sm font-medium text-zinc-200 mb-3">{type}</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor={`min-${type}`}>최소 단가 (원)</Label>
                  <Input
                    id={`min-${type}`}
                    type="number"
                    value={formData.unitPriceMinKrwByMissionType[type] as number}
                    disabled={!editing}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      unitPriceMinKrwByMissionType: {
                        ...prev.unitPriceMinKrwByMissionType,
                        [type]: parseInt(e.target.value)
                      }
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor={`max-${type}`}>최대 단가 (원)</Label>
                  <Input
                    id={`max-${type}`}
                    type="number"
                    value={formData.unitPriceMaxKrwByMissionType[type] as number}
                    disabled={!editing}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      unitPriceMaxKrwByMissionType: {
                        ...prev.unitPriceMaxKrwByMissionType,
                        [type]: parseInt(e.target.value)
                      }
                    }))}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {editing ? (
          <>
            <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
              취소
            </Button>
            <Button type="button" variant="primary" size="sm" disabled={saving} onClick={handleSubmit}>
              {saving ? '저장 중...' : '저장'}
            </Button>
          </>
        ) : (
          <Button type="button" variant="secondary" size="sm" onClick={onEdit}>
            수정
          </Button>
        )}
      </div>
    </div>
  );
}

function PayoutForm({
  currentData,
  onSave,
  onEdit,
  onCancel,
  editing,
  saving
}: {
  currentData: any;
  onSave: (payload: PayoutPayload) => void;
  onEdit: () => void;
  onCancel: () => void;
  editing: boolean;
  saving: boolean;
}) {
  const [formData, setFormData] = useState(currentData?.minPayoutKrw || 1000);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ minPayoutKrw: formData });
  };

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900/50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Label htmlFor="minPayout">최소 출금 금액 (원)</Label>
            <Input
              id="minPayout"
              type="number"
              value={formData}
              disabled={!editing}
              onChange={(e) => setFormData(parseInt(e.target.value))}
              min="0"
            />
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        {editing ? (
          <>
            <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
              취소
            </Button>
            <Button type="button" variant="primary" size="sm" disabled={saving} onClick={handleSubmit}>
              {saving ? '저장 중...' : '저장'}
            </Button>
          </>
        ) : (
          <Button type="button" variant="secondary" size="sm" onClick={onEdit}>
            수정
          </Button>
        )}
      </div>
    </div>
  );
}
