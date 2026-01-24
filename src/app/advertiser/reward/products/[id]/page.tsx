'use client';

import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  const error = searchParams.get('error');
  const [product, setProduct] = useState<Product | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [productOrderLimits, setProductOrderLimits] = useState<{maxAdditionalDays: number; maxDailyTarget: number} | null>(null);
  const [additionalDaysValue, setAdditionalDaysValue] = useState<string>("0");
  const [dailyTargetValue, setDailyTargetValue] = useState<string>("");

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
  const validateOrder = (): Record<string, string> => {
    const errors: Record<string, string> = {};

    // 입력값 존재성 및 형식 검증
    if (!additionalDaysValue || additionalDaysValue.trim() === "") {
      errors.additionalDays = '추가 일수를 입력해주세요.';
      return errors;
    }

    if (!dailyTargetValue || dailyTargetValue.trim() === "") {
      errors.dailyTarget = '일일 목표 수량을 입력해주세요.';
      return errors;
    }

    const additionalDays = parseInt(additionalDaysValue);
    const dailyTarget = parseInt(dailyTargetValue);

    // 숫자 형식 검증
    if (isNaN(additionalDays)) {
      errors.additionalDays = '추가 일수는 숫자만 입력 가능합니다.';
      return errors;
    }

    if (isNaN(dailyTarget)) {
      errors.dailyTarget = '일일 목표 수량은 숫자만 입력 가능합니다.';
      return errors;
    }

    // 값 범위 검증
    if (additionalDays < 0) {
      errors.additionalDays = '추가 일수는 0 이상이어야 합니다.';
      return errors;
    }

    if (dailyTarget < 1) {
      errors.dailyTarget = '일일 목표 수량은 1개 이상이어야 합니다.';
      return errors;
    }

    // 정책 최대치 검증
    const maxDays = productOrderLimits?.maxAdditionalDays || 300;
    if (additionalDays > maxDays) {
      errors.additionalDays = `추가 일수는 최대 ${maxDays}일까지 가능합니다.`;
      return errors;
    }

    const maxTarget = productOrderLimits?.maxDailyTarget || 1000;
    if (dailyTarget > maxTarget) {
      errors.dailyTarget = `일일 목표 수량은 최대 ${maxTarget}개까지 가능합니다.`;
      return errors;
    }

    // 결제 금액 검증
    if (product) {
      const totalDays = product.minOrderDays + additionalDays;
      const totalQuantity = totalDays * dailyTarget;
      const estimatedTotal = totalQuantity * product.unitPriceKrw * (1 + product.vatPercent / 100);

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
  const calculatePaymentAmount = (additionalDays: number, dailyTarget: number): number => {
    if (!product || additionalDays < 0 || !dailyTarget || dailyTarget < 1) {
      return 0;
    }

    // 총 기간 = 최소 주문 기간 + 추가 일수
    const totalDays = product.minOrderDays + additionalDays;

    // 총 수량 = 총 기간 * 일일 목표 수량
    const totalQuantity = totalDays * dailyTarget;

    // 금액 계산 = 총수량 * 단가 * (1 + VAT/100)
    const amount = totalQuantity * product.unitPriceKrw * (1 + product.vatPercent / 100);

    return Math.round(amount); // 정수로 반올림
  };

  // 추가 일수 입력 변경 핸들러
  const handleAdditionalDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numValue = parseInt(value) || 0;
    const maxDays = productOrderLimits?.maxAdditionalDays || 300;

    // 최대치를 초과하면 자동으로 최대치로 설정
    const clampedValue = Math.min(numValue, maxDays);
    setAdditionalDaysValue(clampedValue.toString());

    // 결제 금액 업데이트
    const dailyTarget = parseInt(dailyTargetValue) || 0;
    const amount = calculatePaymentAmount(clampedValue, dailyTarget);
    setPaymentAmount(amount);
  };

  // 일일 목표 수량 입력 변경 핸들러
  const handleDailyTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numValue = parseInt(value) || 0;
    const maxTarget = productOrderLimits?.maxDailyTarget || 1000;

    // 최대치를 초과하면 자동으로 최대치로 설정
    const clampedValue = Math.min(numValue, maxTarget);
    setDailyTargetValue(clampedValue.toString());

    // 결제 금액 업데이트
    const additionalDays = parseInt(additionalDaysValue) || 0;
    const amount = calculatePaymentAmount(additionalDays, clampedValue);
    setPaymentAmount(amount);
  };

  const handlePaymentClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // 일단 무조건 폼 제출 방지

    const validationErrors = validateOrder();

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

    // 검증 통과 시 폼 제출
    setFieldErrors({});
    const form = e.currentTarget.closest('form') as HTMLFormElement;
    if (form) {
      form.submit();
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
              <form action="/api/advertiser/product-orders" method="post" className="space-y-6">
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="paymentAmount" value={paymentAmount} />
                <input type="hidden" name="additionalDays" value={additionalDaysValue} />
                <input type="hidden" name="dailyTarget" value={dailyTargetValue} />
                <input type="hidden" name="startDate" value={new Date().toISOString().split('T')[0]} />
                <input type="hidden" name="endDate" value={new Date(Date.now() + (product.minOrderDays + parseInt(additionalDaysValue || '0')) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} />

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

                <div className="space-y-2">
                  <Label htmlFor="additionalDays">추가 일수 (최대 {productOrderLimits?.maxAdditionalDays || 300}일)</Label>
                  <Input
                    id="additionalDays"
                    type="number"
                    required
                    min={0}
                    max={productOrderLimits?.maxAdditionalDays || 300}
                    step={1}
                    placeholder="예: 3"
                    value={additionalDaysValue}
                    onChange={handleAdditionalDaysChange}
                  />
                  {fieldErrors.additionalDays && (
                    <div className="text-sm text-red-400">{fieldErrors.additionalDays}</div>
                  )}
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-amber-400">
                      최소 주문 기간은 {product.minOrderDays}일입니다.
                    </div>
                    <div className="text-sm text-zinc-400">
                      최소일수외 추가 일수를 작성해 주세요.
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dailyTarget">일일 목표 수량 (최대 {productOrderLimits?.maxDailyTarget || 1000}개)</Label>
                  <Input
                    id="dailyTarget"
                    type="number"
                    required
                    min={1}
                    max={productOrderLimits?.maxDailyTarget || 1000}
                    step={1}
                    placeholder="예: 150"
                    value={dailyTargetValue}
                    onChange={handleDailyTargetChange}
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
                  <Select id="paymentMethod" name="paymentMethod" required>
                    <option value="TOSS">토스페이먼츠 카드 결제</option>
                    <option value="DEV">DEV 즉시 반영 (개발용)</option>
                  </Select>
                  {fieldErrors.paymentMethod && (
                    <div className="text-sm text-red-400">{fieldErrors.paymentMethod}</div>
                  )}
                </div>

                <Button type="submit" variant="primary" className="w-full" onClick={handlePaymentClick}>
                  결제하기
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