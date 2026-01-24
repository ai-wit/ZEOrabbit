'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageShell } from "@/app/_ui/shell";
import { AdminHeader } from "@/app/admin/_components/AdminHeader";
import { Button, ButtonLink, Card, CardBody, Input, Label, TextArea } from "@/app/_ui/primitives";

interface ProductOrder {
  id: string;
  startDate: string;
  endDate: string;
  dailyTarget: number;
  totalAmountKrw: number;
  unitPriceKrw: number;
  advertiser: {
    id: string;
    user: { name: string | null; email: string | null };
  };
  place: {
    id: string;
    name: string;
  };
  product: {
    id: string;
    name: string;
    missionType: string;
    marketingCopy: string | null;
  };
}

export default function NewCampaignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams?.get('orderId');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState<ProductOrder | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 캠페인 설정 폼 데이터
  const [formData, setFormData] = useState({
    name: '',
    missionText: '',
    dailyTarget: 0,
    rewardKrw: 0,
    startDate: '',
    endDate: '',
    buttons: [] as Array<{ id?: string; label: string; url: string; sortOrder: number }>
  });

  useEffect(() => {
    if (orderId) {
      loadOrderData();
    } else {
      setError('주문 ID가 제공되지 않았습니다.');
      setLoading(false);
    }
  }, [orderId]);

  const loadOrderData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 주문 정보 조회 API 호출 (실제로는 이 API가 필요할 수 있음)
      // 일단은 임시로 기본 정보 설정
      const response = await fetch(`/api/admin/reward/product-orders/${orderId}`);
      if (!response.ok) {
        throw new Error('주문 정보를 불러올 수 없습니다.');
      }

      const orderData = await response.json();
      setOrder(orderData.order);

      // 폼 초기화 - 주문 정보 기반
      setFormData({
        name: `${orderData.order.place.name} - ${orderData.order.product.name}`,
        missionText: orderData.order.product.marketingCopy || '',
        dailyTarget: orderData.order.dailyTarget,
        rewardKrw: Math.floor(orderData.order.unitPriceKrw * 0.8), // 기본 리워드 금액 설정 (단가의 80%)
        startDate: orderData.order.startDate.split('T')[0],
        endDate: orderData.order.endDate.split('T')[0],
        buttons: []
      });
    } catch (error) {
      console.error('주문 데이터 로드 실패:', error);
      setError(error instanceof Error ? error.message : '주문 정보를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addButton = () => {
    setFormData(prev => ({
      ...prev,
      buttons: [...prev.buttons, { label: '', url: '', sortOrder: prev.buttons.length }]
    }));
  };

  const removeButton = (index: number) => {
    setFormData(prev => ({
      ...prev,
      buttons: prev.buttons.filter((_, i) => i !== index)
    }));
  };

  const updateButton = (index: number, field: 'label' | 'url', value: string) => {
    setFormData(prev => ({
      ...prev,
      buttons: prev.buttons.map((btn, i) =>
        i === index ? { ...btn, [field]: value } : btn
      )
    }));
  };

  const handleSubmit = async () => {
    if (!order) return;

    // 유효성 검사
    if (!formData.name.trim()) {
      alert('캠페인 이름을 입력해주세요.');
      return;
    }

    if (!formData.missionText.trim()) {
      alert('미션 설명을 입력해주세요.');
      return;
    }

    if (formData.dailyTarget <= 0) {
      alert('일일 목표는 1 이상이어야 합니다.');
      return;
    }

    if (formData.rewardKrw <= 0) {
      alert('리워드 금액은 1원 이상이어야 합니다.');
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      alert('캠페인 기간을 설정해주세요.');
      return;
    }

    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      alert('종료일은 시작일보다 늦어야 합니다.');
      return;
    }

    try {
      setSaving(true);

      const campaignData = {
        productOrderId: order.id,
        name: formData.name.trim(),
        missionText: formData.missionText.trim(),
        dailyTarget: formData.dailyTarget,
        rewardKrw: formData.rewardKrw,
        startDate: formData.startDate,
        endDate: formData.endDate,
        buttons: formData.buttons
          .map((b, idx) => ({ ...b, sortOrder: b.sortOrder ?? idx }))
          .filter((b) => b.label.trim() && b.url.trim())
      };

      const response = await fetch('/api/admin/reward/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '캠페인 등록에 실패했습니다.');
      }

      const result = await response.json();
      alert('캠페인이 성공적으로 등록되었습니다.');
      router.push('/admin/reward/campaigns');
    } catch (error) {
      console.error('캠페인 등록 실패:', error);
      alert(error instanceof Error ? error.message : '캠페인 등록에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageShell
        header={
          <AdminHeader
            title="새 캠페인 등록"
            description="캠페인 세부 정보를 설정하고 등록합니다."
          />
        }
      >
        <div className="flex items-center justify-center min-h-96">
          <div className="text-lg">로딩 중...</div>
        </div>
      </PageShell>
    );
  }

  if (error || !order) {
    return (
      <PageShell
        header={
          <AdminHeader
            title="새 캠페인 등록"
            description="캠페인 세부 정보를 설정하고 등록합니다."
          />
        }
      >
        <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
          <div className="text-lg text-red-500">{error || '주문 정보를 불러올 수 없습니다.'}</div>
          <ButtonLink href="/admin/reward/campaigns" variant="secondary">
            목록
          </ButtonLink>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      header={
        <AdminHeader
          title="새 캠페인 등록"
          description={`${order.place.name} - ${order.product.name}`}
        />
      }
    >
      <div className="space-y-6">
        {/* 주문 정보 표시 */}
        <Card>
          <CardBody className="space-y-4">
            <div className="text-sm font-semibold text-zinc-50">주문 정보</div>
            <div className="grid gap-2 text-sm">
              <div className="text-zinc-400">
                <span className="font-medium">광고주:</span> {order.advertiser.user.name || order.advertiser.user.email}
              </div>
              <div className="text-zinc-400">
                <span className="font-medium">장소:</span> {order.place.name}
              </div>
              <div className="text-zinc-400">
                <span className="font-medium">상품:</span> {order.product.name} ({order.product.missionType})
              </div>
              <div className="text-zinc-400">
                <span className="font-medium">주문 기간:</span> {new Date(order.startDate).toLocaleDateString('ko-KR')} ~ {new Date(order.endDate).toLocaleDateString('ko-KR')}
              </div>
              <div className="text-zinc-400">
                <span className="font-medium">일일 목표:</span> {order.dailyTarget}명
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 캠페인 설정 */}
        <Card>
          <CardBody className="space-y-6">
            <div className="text-sm font-semibold text-zinc-50">캠페인 설정</div>

            <div className="space-y-6">
              {/* 캠페인 이름 - 전체 너비 */}
              <div className="space-y-2">
                <Label htmlFor="name">캠페인 이름</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="캠페인 이름을 입력하세요"
                />
              </div>

              {/* 일일 참여 목표 + 리워드 금액 */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dailyTarget">일일 참여 목표</Label>
                  <Input
                    id="dailyTarget"
                    type="number"
                    value={formData.dailyTarget}
                    onChange={(e) => handleInputChange('dailyTarget', parseInt(e.target.value) || 0)}
                    placeholder="일일 목표 참여자 수"
                    min="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rewardKrw">리워드 금액 (원)</Label>
                  <Input
                    id="rewardKrw"
                    type="number"
                    value={formData.rewardKrw}
                    onChange={(e) => handleInputChange('rewardKrw', parseInt(e.target.value) || 0)}
                    placeholder="참여자당 리워드 금액"
                    min="1"
                  />
                </div>
              </div>

              {/* 시작일 + 종료일 */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">시작일</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">종료일</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="missionText">미션 설명</Label>
              <TextArea
                id="missionText"
                value={formData.missionText}
                onChange={(value) => handleInputChange('missionText', value)}
                placeholder="리워더가 수행해야 할 미션에 대한 설명을 입력하세요"
                rows={4}
              />
            </div>

            {/* 추가 옵션 버튼 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-zinc-50">추가 옵션 버튼</div>
                <Button type="button" onClick={addButton} variant="secondary" size="sm">
                  버튼 추가
                </Button>
              </div>
              <div className="space-y-3">
                {formData.buttons.length === 0 ? (
                  <div className="text-sm text-zinc-400">등록된 버튼이 없습니다.</div>
                ) : (
                  formData.buttons.map((button, idx) => (
                    <div key={idx} className="grid gap-3 sm:grid-cols-5 items-end">
                      <div className="sm:col-span-2">
                        <Label htmlFor={`button-label-${idx}`}>버튼 이름</Label>
                        <Input
                          id={`button-label-${idx}`}
                          value={button.label}
                          placeholder="버튼 이름"
                          onChange={(e) => updateButton(idx, 'label', e.target.value)}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label htmlFor={`button-url-${idx}`}>URL</Label>
                        <Input
                          id={`button-url-${idx}`}
                          value={button.url}
                          placeholder="https://..."
                          onChange={(e) => updateButton(idx, 'url', e.target.value)}
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <Button
                          type="button"
                          onClick={() => removeButton(idx)}
                          variant="danger"
                          size="sm"
                          className="w-full"
                        >
                          삭제
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 액션 버튼 */}
        <div className="flex flex-wrap gap-3 justify-end">
          <ButtonLink href="/admin/reward/campaigns" variant="secondary">
            취소
          </ButtonLink>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            variant="primary"
          >
            {saving ? '등록 중...' : '캠페인 등록'}
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
