'use client';

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageShell } from "@/app/_ui/shell";
import { Button, Card, CardBody, Hint, Input, Label, Select, Callout } from "@/app/_ui/primitives";
import { AdvertiserHeader } from "@/app/advertiser/_components/AdvertiserHeader";
import { DateInput } from "@/app/_ui/DateInput";
import { getProductOrderLimitsPolicy } from "@/server/policy/get-policy";

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
  const router = useRouter();
  const error = searchParams.get('error');
  const errorMessage = searchParams.get('errorMessage');
  const [product, setProduct] = useState<Product | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [productOrderLimits, setProductOrderLimits] = useState<{maxAdditionalDays: number; maxDailyTarget: number} | null>(null);
  const [orderDaysValue, setOrderDaysValue] = useState<string>("0");
  const [dailyTargetValue, setDailyTargetValue] = useState<string>("");
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("TOSS");
  const DAY_MS = 24 * 60 * 60 * 1000;

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 사용자 정보 가져오기
        const userResponse = await fetch('/api/me');
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setCurrentUser(userData.user);
        }

        // 상품 주문 제한 정책 가져오기
        const limitsResponse = await fetch('/api/advertiser/product-order-limits');
        if (limitsResponse.ok) {
          const limitsData = await limitsResponse.json();
          setProductOrderLimits(limitsData);
        }

        const response = await fetch(`/api/advertiser/products/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setProduct(data.product);
          setPlaces(data.places);
          setOrderDaysValue(data.product.minOrderDays.toString());
          if (data.places?.length && !selectedPlaceId) {
            setSelectedPlaceId(data.places[0].id);
          }
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
  const getServerErrorMessage = (errorCode: string | null, messageOverride?: string | null) => {
    if (messageOverride && messageOverride.trim() !== "") {
      return messageOverride;
    }
    switch (errorCode) {
      case 'productNotFound':
        return '상품을 찾을 수 없습니다.';
      case 'managerNotAllowed':
        return '매니저는 상품을 구매할 수 없습니다.';
      case 'invalid':
        return '입력값이 올바르지 않습니다.';
      case 'date':
        return '날짜 입력이 올바르지 않습니다.';
      case 'notfound':
        return '상품 또는 플레이스를 찾을 수 없습니다.';
      case 'minDays':
        return '주문 일수가 최소 기간보다 짧습니다.';
      default:
        return errorCode ? `처리중 오류가 발생했습니다: ${errorCode}` : null;
    }
  };

  const getOrderDaysRange = () => {
    const minDays = product?.minOrderDays ?? 0;
    const maxDays = productOrderLimits?.maxAdditionalDays ?? 300;
    return {
      minDays,
      maxDays: Math.max(maxDays, minDays),
    };
  };

  const getDailyTargetRange = () => {
    const minTarget = 1;
    const maxTarget = productOrderLimits?.maxDailyTarget ?? 1000;
    return {
      minTarget,
      maxTarget: Math.max(maxTarget, minTarget),
    };
  };

  const clampValue = (value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max);
  };

  const normalizeOrderDays = (value: string) => {
    if (!value || value.trim() === "") {
      return null;
    }
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      return null;
    }
    const { minDays, maxDays } = getOrderDaysRange();
    return clampValue(parsed, minDays, maxDays);
  };

  const normalizeDailyTarget = (value: string) => {
    if (!value || value.trim() === "") {
      return null;
    }
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      return null;
    }
    const { minTarget, maxTarget } = getDailyTargetRange();
    return clampValue(parsed, minTarget, maxTarget);
  };

  // 결제 버튼 클릭 시 클라이언트 측 검증
  const validateOrder = (
    form?: HTMLFormElement | null,
    normalized?: { orderDays: number | null; dailyTarget: number | null },
  ): Record<string, string> => {
    const errors: Record<string, string> = {};

    // 입력값 존재성 및 형식 검증
    if (!orderDaysValue || orderDaysValue.trim() === "") {
      errors.orderDays = '주문 일수를 입력해주세요.';
      return errors;
    }

    if (!dailyTargetValue || dailyTargetValue.trim() === "") {
      errors.dailyTarget = '일일 목표 수량을 입력해주세요.';
      return errors;
    }

    const orderDays = normalized?.orderDays ?? parseInt(orderDaysValue, 10);
    const dailyTarget = normalized?.dailyTarget ?? parseInt(dailyTargetValue, 10);

    // 숫자 형식 검증
    if (!Number.isFinite(orderDays)) {
      errors.orderDays = '주문 일수는 숫자만 입력 가능합니다.';
      return errors;
    }

    if (!Number.isFinite(dailyTarget)) {
      errors.dailyTarget = '일일 목표 수량은 숫자만 입력 가능합니다.';
      return errors;
    }

    // 값 범위 검증
    const { minDays, maxDays } = getOrderDaysRange();
    if (orderDays < minDays) {
      errors.orderDays = `주문 일수는 최소 ${minDays}일 이상이어야 합니다.`;
      return errors;
    }

    if (orderDays > maxDays) {
      errors.orderDays = `주문 일수는 최대 ${maxDays}일까지 가능합니다.`;
      return errors;
    }

    const { minTarget, maxTarget } = getDailyTargetRange();
    if (dailyTarget < minTarget) {
      errors.dailyTarget = '일일 목표 수량은 1개 이상이어야 합니다.';
      return errors;
    }

    if (dailyTarget > maxTarget) {
      errors.dailyTarget = `일일 목표 수량은 최대 ${maxTarget}개까지 가능합니다.`;
      return errors;
    }

    if (form) {
      const formData = new FormData(form);
      const placeId = formData.get('placeId');
      if (!placeId) {
        errors.placeId = '플레이스를 선택해주세요.';
        return errors;
      }

      const paymentMethod = formData.get('paymentMethod');
      if (!paymentMethod) {
        errors.paymentMethod = '결제 수단을 선택해주세요.';
        return errors;
      }
    }

    // 결제 금액 검증
    if (product) {
      const totalDays = orderDays;
      const totalQuantity = totalDays * dailyTarget;
      const budgetTotalKrw = totalQuantity * product.unitPriceKrw;
      const vatAmountKrw = Math.round((budgetTotalKrw * product.vatPercent) / 100);
      const estimatedTotal = budgetTotalKrw + vatAmountKrw;

      if (estimatedTotal <= 0 || !isFinite(estimatedTotal)) {
        errors.dailyTarget = '결제 금액 계산에 문제가 있습니다. 입력값을 확인해주세요.';
        return errors;
      }

      // 너무 큰 금액 검증 (선택사항)
      const maxReasonableAmount = 100000000; // 1억원
      if (estimatedTotal > maxReasonableAmount) {
        errors.dailyTarget = '계산된 금액이 너무 큽니다. 입력값을 확인해주세요.';
        return errors;
      }
    }

    return errors;
  };

  // 결제 금액 계산 함수
  const calculatePaymentAmount = (orderDays: number, dailyTarget: number): number => {
    if (!product || orderDays < 0 || !dailyTarget || dailyTarget < 1) {
      return 0;
    }

    // 총 기간 = 주문 일수
    const totalDays = orderDays;

    // 총 수량 = 총 기간 * 일일 목표 수량
    const totalQuantity = totalDays * dailyTarget;

    // 금액 계산 = 총수량 * 단가 + VAT (서버 계산과 동일하게)
    const budgetTotalKrw = totalQuantity * product.unitPriceKrw;
    const vatAmountKrw = Math.round((budgetTotalKrw * product.vatPercent) / 100);
    const amount = budgetTotalKrw + vatAmountKrw;

    return amount;
  };

  // 주문 일수 입력 변경 핸들러
  const handleOrderDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setOrderDaysValue(value);

    const normalizedOrderDays = normalizeOrderDays(value);

    // 결제 금액 업데이트
    const normalizedDailyTarget = normalizeDailyTarget(dailyTargetValue);
    const amount =
      normalizedOrderDays !== null && normalizedDailyTarget !== null
        ? calculatePaymentAmount(normalizedOrderDays, normalizedDailyTarget)
        : 0;
    setPaymentAmount(amount);
  };

  // Normalize min/max on blur for order days
  const handleOrderDaysBlur = () => {
    const normalizedOrderDays = normalizeOrderDays(orderDaysValue);
    if (normalizedOrderDays === null) {
      const { minDays } = getOrderDaysRange();
      setOrderDaysValue(minDays.toString());

      const normalizedDailyTarget = normalizeDailyTarget(dailyTargetValue);
      const amount =
        normalizedDailyTarget !== null
          ? calculatePaymentAmount(minDays, normalizedDailyTarget)
          : 0;
      setPaymentAmount(amount);
      return;
    }

    const nextValue = normalizedOrderDays.toString();
    if (nextValue !== orderDaysValue) {
      setOrderDaysValue(nextValue);
    }

    const normalizedDailyTarget = normalizeDailyTarget(dailyTargetValue);
    const amount =
      normalizedDailyTarget !== null
        ? calculatePaymentAmount(normalizedOrderDays, normalizedDailyTarget)
        : 0;
    setPaymentAmount(amount);
  };

  // 일일 목표 수량 입력 변경 핸들러
  const handleDailyTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDailyTargetValue(value);

    const { minTarget, maxTarget } = getDailyTargetRange();
    const parsed = parseInt(value, 10);
    if (!value || value.trim() === "") {
      setFieldErrors((prev) => ({ ...prev, dailyTarget: '일일 목표 수량을 입력해주세요.' }));
    } else if (Number.isNaN(parsed)) {
      setFieldErrors((prev) => ({ ...prev, dailyTarget: '일일 목표 수량은 숫자만 입력 가능합니다.' }));
    } else if (parsed < minTarget) {
      setFieldErrors((prev) => ({ ...prev, dailyTarget: '일일 목표 수량은 1개 이상이어야 합니다.' }));
    } else if (parsed > maxTarget) {
      setFieldErrors((prev) => ({ ...prev, dailyTarget: `일일 목표 수량은 최대 ${maxTarget}개까지 가능합니다.` }));
    } else {
      setFieldErrors((prev) => {
        if (!prev.dailyTarget) {
          return prev;
        }
        const { dailyTarget, ...rest } = prev;
        return rest;
      });
    }

    // 결제 금액 업데이트
    const normalizedOrderDays = normalizeOrderDays(orderDaysValue);
    const normalizedDailyTarget = normalizeDailyTarget(value);
    const amount =
      normalizedOrderDays !== null && normalizedDailyTarget !== null
        ? calculatePaymentAmount(normalizedOrderDays, normalizedDailyTarget)
        : 0;
    setPaymentAmount(amount);
  };

  const handleDailyTargetBlur = () => {
    const normalizedDailyTarget = normalizeDailyTarget(dailyTargetValue);
    const { minTarget, maxTarget } = getDailyTargetRange();

    if (normalizedDailyTarget === null) {
      setDailyTargetValue(minTarget.toString());
      setFieldErrors((prev) => {
        const { dailyTarget, ...rest } = prev;
        return rest;
      });

      const normalizedOrderDays = normalizeOrderDays(orderDaysValue);
      const amount =
        normalizedOrderDays !== null
          ? calculatePaymentAmount(normalizedOrderDays, minTarget)
          : 0;
      setPaymentAmount(amount);
      return;
    }

    const clampedTarget = clampValue(normalizedDailyTarget, minTarget, maxTarget);
    const nextValue = clampedTarget.toString();
    if (nextValue !== dailyTargetValue) {
      setDailyTargetValue(nextValue);
    }

    setFieldErrors((prev) => {
      const { dailyTarget, ...rest } = prev;
      return rest;
    });

    const normalizedOrderDays = normalizeOrderDays(orderDaysValue);
    const amount =
      normalizedOrderDays !== null
        ? calculatePaymentAmount(normalizedOrderDays, clampedTarget)
        : 0;
    setPaymentAmount(amount);
  };

  const handlePaymentClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // 일단 무조건 폼 제출 방지

    const form = e.currentTarget.closest('form') as HTMLFormElement | null;
    const normalizedOrderDays = normalizeOrderDays(orderDaysValue);
    const normalizedDailyTarget = normalizeDailyTarget(dailyTargetValue);

    if (normalizedOrderDays !== null) {
      const nextValue = normalizedOrderDays.toString();
      if (nextValue !== orderDaysValue) {
        setOrderDaysValue(nextValue);
      }
    }

    if (normalizedDailyTarget !== null) {
      const nextValue = normalizedDailyTarget.toString();
      if (nextValue !== dailyTargetValue) {
        setDailyTargetValue(nextValue);
      }
    }

    const amount =
      normalizedOrderDays !== null && normalizedDailyTarget !== null
        ? calculatePaymentAmount(normalizedOrderDays, normalizedDailyTarget)
        : 0;
    setPaymentAmount(amount);

    const validationErrors = validateOrder(form, {
      orderDays: normalizedOrderDays,
      dailyTarget: normalizedDailyTarget,
    });

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      // 첫 번째 에러가 있는 필드로 스크롤
      const firstErrorField = Object.keys(validationErrors)[0];
      const errorField = document.querySelector(`[name="${firstErrorField}"]`) as HTMLElement;
      if (errorField) {
        errorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        errorField.focus();
      }
      return; // 검증 실패 시 여기서 중단
    }

    // 검증 통과 시 결제 확인 페이지로 이동
    setFieldErrors({});
    const reviewParams = new URLSearchParams({
      placeId: selectedPlaceId,
      orderDays: (normalizedOrderDays ?? product?.minOrderDays ?? 1).toString(),
      dailyTarget: (normalizedDailyTarget ?? 1).toString(),
      paymentMethod: selectedPaymentMethod,
    });
    router.push(`/advertiser/reward/products/${params.id}/review?${reviewParams.toString()}`);
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
            {getServerErrorMessage(error, errorMessage)}
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
            <div>
              <h3 className="text-lg font-semibold mb-2">환불 정책</h3>
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <textarea
                  className="w-full text-sm text-zinc-200 bg-transparent resize-y min-h-[200px] max-h-[400px] border-none outline-none"
                  readOnly
                  style={{overflow: "auto"}}
                  value={`환불정책

본 환불정책은 본 사이트(ZEOrabbit)에서 제공하는 모든 유료 서비스에 적용됩니다.

1. 결제 및 서비스 개시

서비스는 결제 완료 후 즉시 개시되거나, 사전에 안내된 일정에 따라 제공됩니다.

결제 완료와 동시에 서비스 이용 계약이 성립됩니다.

2. 환불 가능 기준

다음 각 호에 해당하는 경우에 한해 환불이 가능합니다.

- 회사의 귀책 사유로 서비스 제공이 불가능한 경우
- 서비스가 정상적으로 제공되지 않았음이 객관적으로 입증되는 경우
- 서비스 개시 전 이용자가 환불을 요청한 경우

3. 환불 불가 기준

다음 각 호에 해당하는 경우 환불이 제한됩니다.

- 서비스가 이미 개시되었거나 일부라도 제공된 경우
- 이용자의 단순 변심, 기대 불일치, 내부 사정에 의한 요청
- 이용자의 귀책 사유로 서비스 이용이 제한되거나 중단된 경우
- 맞춤형 제작, 기획, 설정, 컨설팅 등 성격상 재판매가 불가능한 서비스

4. 환불 금액 산정

- 서비스 개시 전: 전액 환불
- 서비스 개시 후: 제공된 범위를 제외한 금액에서 위약금 또는 실비를 공제 후 환불
- 환불 시 발생하는 결제 수수료는 이용자가 부담할 수 있습니다.

5. 환불 절차

환불 요청은 고객센터 또는 사전에 안내된 공식 채널을 통해 접수합니다.
`}
                />
              </div>
            </div>
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
              <form className="space-y-6">

                <div className="space-y-2">
                  <Label htmlFor="placeId">플레이스</Label>
                  <Select
                    id="placeId"
                    name="placeId"
                    required
                    value={selectedPlaceId}
                    onChange={(e) => setSelectedPlaceId(e.target.value)}
                  >
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

                <div className="space-y-2">
                  <Label htmlFor="orderDays">주문 일수 (최소 {product.minOrderDays}일, 최대 {productOrderLimits?.maxAdditionalDays || 300}일)</Label>
                  <Input
                    id="orderDays"
                    name="orderDays"
                    type="number"
                    required
                    min={product.minOrderDays}
                    max={productOrderLimits?.maxAdditionalDays || 300}
                    step={1}
                    placeholder="예: 7"
                    value={orderDaysValue}
                    onChange={handleOrderDaysChange}
                    onBlur={handleOrderDaysBlur}
                  />
                  {fieldErrors.orderDays && (
                    <div className="text-sm text-red-400">{fieldErrors.orderDays}</div>
                  )}
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-amber-400">
                      최소 주문 기간은 {product.minOrderDays}일 이상입니다.
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dailyTarget">일일 목표 수량 (최대 {productOrderLimits?.maxDailyTarget || 1000}개)</Label>
                  <Input
                    id="dailyTarget"
                    name="dailyTarget"
                    type="number"
                    required
                    min={1}
                    max={productOrderLimits?.maxDailyTarget || 1000}
                    step={1}
                    placeholder="예: 150"
                    value={dailyTargetValue}
                    onChange={handleDailyTargetChange}
                    onBlur={handleDailyTargetBlur}
                  />
                  {fieldErrors.dailyTarget && (
                    <div className="text-sm text-red-400">{fieldErrors.dailyTarget}</div>
                  )}
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
                  <Select
                    id="paymentMethod"
                    name="paymentMethod"
                    required
                    value={selectedPaymentMethod}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                  >
                    <option value="TOSS">토스페이먼츠 카드 결제</option>
                    <option value="DEV">DEV 즉시 반영 (개발용)</option>
                  </Select>
                  {fieldErrors.paymentMethod && (
                    <div className="text-sm text-red-400">{fieldErrors.paymentMethod}</div>
                  )}
                </div>

                <Button type="button" variant="primary" className="w-full" onClick={handlePaymentClick}>
                  구매하기
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