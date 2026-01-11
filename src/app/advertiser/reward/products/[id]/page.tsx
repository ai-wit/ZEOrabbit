'use client';

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageShell } from "@/app/_ui/shell";
import { Button, Card, CardBody, Hint, Input, Label, Select, Callout } from "@/app/_ui/primitives";
import { AdvertiserHeader } from "@/app/advertiser/_components/AdvertiserHeader";
import { DateInput } from "@/app/_ui/DateInput";

type Product = {
  id: string;
  name: string;
  missionType: string;
  unitPriceKrw: number;
  vatPercent: number;
  minOrderDays: number;
  marketingCopy: string | null;
  guideText: string | null;
};

type Place = {
  id: string;
  name: string;
};

export default function AdvertiserProductDetailPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const [product, setProduct] = useState<Product | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 사용자 정보 가져오기
        const userResponse = await fetch('/api/me');
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setCurrentUser(userData.user);
        }

        const response = await fetch(`/api/advertiser/products/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setProduct(data.product);
          setPlaces(data.places);
        }
      } catch (error) {
        console.error('Failed to fetch product data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id]);

  // 서버 처리중 에러 메시지 (URL 파라미터에서 받은 에러)
  const getServerErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case 'productNotFound':
        return '상품을 찾을 수 없습니다.';
      case 'managerNotAllowed':
        return '매니저는 상품을 구매할 수 없습니다.';
      default:
        return errorCode ? `처리중 오류가 발생했습니다: ${errorCode}` : null;
    }
  };

  // 결제 버튼 클릭 시 클라이언트 측 검증
  const validateOrder = (formData: FormData): Record<string, string> => {
    const errors: Record<string, string> = {};
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const dailyTarget = parseInt(formData.get('dailyTarget') as string);

    // 날짜 유효성 검증
    if (!startDate) {
      errors.startDate = '시작일을 선택해주세요.';
    }
    if (!endDate) {
      errors.endDate = '종료일을 선택해주세요.';
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (start < today) {
        errors.startDate = '시작일은 오늘 이후여야 합니다.';
      }

      if (end <= start) {
        errors.endDate = '종료일은 시작일보다 늦어야 합니다.';
      }

      // 최소 기간 검증
      if (product && Object.keys(errors).length === 0) {
        const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff < product.minOrderDays) {
          errors.endDate = `최소 주문 기간보다 짧습니다. 기간을 ${product.minOrderDays}일 이상으로 설정해주세요.`;
        }
      }
    }

    // 일일 목표 수량 검증
    if (!dailyTarget || dailyTarget < 1) {
      errors.dailyTarget = '일일 목표 수량은 1개 이상이어야 합니다.';
    }

    // 예산 부족 검증 (간단한 추정치 계산)
    if (product && startDate && endDate && dailyTarget && Object.keys(errors).length === 0) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const totalQuantity = daysDiff * dailyTarget;
      const estimatedTotal = totalQuantity * product.unitPriceKrw * (1 + product.vatPercent / 100);

      // 실제 예산 체크는 서버에서 하지만, 여기서는 기본적인 추정만
      if (estimatedTotal <= 0) {
        errors.dailyTarget = '계산된 금액이 올바르지 않습니다.';
      }
    }

    return errors; // 에러 객체 반환
  };

  // 결제 금액 계산 함수
  const calculatePaymentAmount = (startDate: string, endDate: string, dailyTarget: number): number => {
    if (!product || !startDate || !endDate || !dailyTarget || dailyTarget < 1) {
      return 0;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return 0;
    }

    // 일수 계산 (종료일 포함)
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // 총 수량 = 일수 * 일일 목표 수량
    const totalQuantity = daysDiff * dailyTarget;

    // 금액 계산 = 총수량 * 단가 * (1 + VAT/100)
    const amount = totalQuantity * product.unitPriceKrw * (1 + product.vatPercent / 100);

    return Math.round(amount); // 정수로 반올림
  };

  // 입력값 변경 시 결제 금액 자동 계산
  const updatePaymentAmount = () => {
    const form = document.querySelector('form[action="/api/advertiser/product-orders"]') as HTMLFormElement;
    if (!form) return;

    const formData = new FormData(form);
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const dailyTargetStr = formData.get('dailyTarget') as string;
    const dailyTarget = dailyTargetStr ? parseInt(dailyTargetStr) : 0;

    const amount = calculatePaymentAmount(startDate, endDate, dailyTarget);
    setPaymentAmount(amount);
  };

  const handlePaymentClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const form = e.currentTarget.closest('form') as HTMLFormElement;
    if (!form) return;

    const formData = new FormData(form);
    const validationErrors = validateOrder(formData);

    if (Object.keys(validationErrors).length > 0) {
      e.preventDefault();
      setFieldErrors(validationErrors);
      // 첫 번째 에러가 있는 필드로 스크롤
      const firstErrorField = Object.keys(validationErrors)[0];
      const errorField = form.querySelector(`[name="${firstErrorField}"]`);
      if (errorField) {
        (errorField as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
        (errorField as HTMLElement).focus();
      }
    } else {
      setFieldErrors({});
      // 폼 제출 진행
    }
  };

  if (loading) {
    return (
      <PageShell header={<AdvertiserHeader title="상품" description="로딩 중..." currentUser={currentUser} />}>
        <Card>
          <CardBody className="text-center py-12">
            <div className="text-sm text-zinc-400">상품 정보를 불러오는 중...</div>
          </CardBody>
        </Card>
      </PageShell>
    );
  }

  if (!product) {
    return (
      <PageShell
        header={<AdvertiserHeader title="상품" description="상품을 찾을 수 없습니다." currentUser={currentUser} />}
      >
        <Card>
          <CardBody className="space-y-4">
            <div className="text-sm text-zinc-300">상품이 없거나 비활성화되었습니다.</div>
            <Link href="/advertiser/reward/products" className="text-sm text-zinc-300 hover:underline underline-offset-4">
              상품 목록으로
            </Link>
          </CardBody>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      header={
        <AdvertiserHeader
          title={product.name}
          description={`단가 ${product.unitPriceKrw}원 · 최소 ${product.minOrderDays}일 · ${product.missionType}`}
          currentUser={currentUser}
        />
      }
    >
      <div className="space-y-8">
        {error && (
          <Callout tone="warning" title="처리중 오류">
            {getServerErrorMessage(error)}
          </Callout>
        )}


        <Card>
          <CardBody className="space-y-4">
            {product.marketingCopy ? (
              <div className="whitespace-pre-wrap rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-zinc-200">
                {product.marketingCopy}
              </div>
            ) : (
              <div className="text-sm text-zinc-400">상품 설명이 없습니다.</div>
            )}
            {product.guideText ? (
              <details className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <summary className="cursor-pointer text-sm font-semibold text-zinc-50">상세 가이드</summary>
                <div className="mt-3 whitespace-pre-wrap text-sm text-zinc-300">{product.guideText}</div>
              </details>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-6">
            {places.length === 0 ? (
              <div className="space-y-2">
                <div className="text-sm text-zinc-300">구매하려면 먼저 플레이스를 등록해야 합니다.</div>
                <Link href="/advertiser/places/new" className="text-sm text-zinc-300 hover:underline underline-offset-4">
                  플레이스 등록하러 가기
                </Link>
              </div>
            ) : (
              <form action="/api/advertiser/product-orders" method="post" className="space-y-6">
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="paymentAmount" value={paymentAmount} />

                <div className="space-y-2">
                  <Label htmlFor="placeId">플레이스</Label>
                  <Select id="placeId" name="placeId" required>
                    {places.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                  {fieldErrors.placeId && (
                    <div className="text-sm text-red-400">{fieldErrors.placeId}</div>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">시작일</Label>
                    <DateInput id="startDate" name="startDate" required onChange={updatePaymentAmount} />
                    {fieldErrors.startDate && (
                      <div className="text-sm text-red-400">{fieldErrors.startDate}</div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">종료일</Label>
                    <DateInput id="endDate" name="endDate" required onChange={updatePaymentAmount} />
                    {fieldErrors.endDate && (
                      <div className="text-sm text-red-400">{fieldErrors.endDate}</div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dailyTarget">일일 목표 수량</Label>
                  <Input id="dailyTarget" name="dailyTarget" type="number" required min={1} step={1} placeholder="예: 150" onChange={updatePaymentAmount} />
                  {fieldErrors.dailyTarget && (
                    <div className="text-sm text-red-400">{fieldErrors.dailyTarget}</div>
                  )}
                  <Hint>최소 주문 기간은 {product.minOrderDays}일입니다. (기간이 짧으면 결제가 진행되지 않습니다)</Hint>
                </div>

                <div className="space-y-2">
                  <Label>결제 금액</Label>
                  <div className="rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100">
                    {paymentAmount.toLocaleString()}원
                    {paymentAmount > 0 && (
                      <span className="ml-2 text-xs text-zinc-400">
                        (VAT {Math.round(paymentAmount * product.vatPercent / (100 + product.vatPercent)).toLocaleString()}원 포함)
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">결제 수단</Label>
                  <Select id="paymentMethod" name="paymentMethod" required>
                    <option value="TOSS">토스페이먼츠 카드 결제</option>
                    <option value="DEV">DEV 즉시 반영 (개발용)</option>
                  </Select>
                  {fieldErrors.paymentMethod && (
                    <div className="text-sm text-red-400">{fieldErrors.paymentMethod}</div>
                  )}
                </div>

                <Button type="submit" variant="primary" className="w-full" onClick={handlePaymentClick}>
                  결제하고 캠페인 시작하기
                </Button>
              </form>
            )}
          </CardBody>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Link href="/advertiser/reward/products" className="text-sm text-zinc-300 hover:underline underline-offset-4">
            ← 상품 목록
          </Link>
          <Link href="/advertiser/reward/campaigns" className="text-sm text-zinc-300 hover:underline underline-offset-4">
            집행 현황(캠페인) 보기 →
          </Link>
        </div>
      </div>
    </PageShell>
  );
}