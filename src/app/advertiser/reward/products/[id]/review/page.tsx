'use client';

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageShell } from "@/app/_ui/shell";
import { Button, Card, CardBody, Callout, Input, Label } from "@/app/_ui/primitives";
import { AdvertiserHeader } from "@/app/advertiser/_components/AdvertiserHeader";

type Product = {
  id: string;
  name: string;
  missionType: string;
  unitPriceKrw: number;
  vatPercent: number;
  minOrderDays: number;
};

type Place = {
  id: string;
  name: string;
};

export default function AdvertiserProductReviewPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [budgetBalance, setBudgetBalance] = useState<number | null>(null);
  const [pointsAppliedValue, setPointsAppliedValue] = useState<string>("0");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const placeId = searchParams.get("placeId") ?? "";
  const orderDays = Number.parseInt(searchParams.get("orderDays") ?? "", 10);
  const dailyTarget = Number.parseInt(searchParams.get("dailyTarget") ?? "", 10);
  const paymentMethod = searchParams.get("paymentMethod") ?? "TOSS";

  const getDateString = (date: Date) => date.toISOString().split("T")[0];
  const getEndDateString = (days: number) => {
    const safeDays = Math.max(days, 1);
    const dayMs = 24 * 60 * 60 * 1000;
    return getDateString(new Date(Date.now() + (safeDays - 1) * dayMs));
  };

  const getComputedAmounts = () => {
    if (!product || !Number.isFinite(orderDays) || !Number.isFinite(dailyTarget)) {
      return { budgetTotalKrw: 0, vatAmountKrw: 0, totalAmountKrw: 0 };
    }
    const totalQty = orderDays * dailyTarget;
    const budgetTotalKrw = totalQty * product.unitPriceKrw;
    const vatAmountKrw = Math.round((budgetTotalKrw * product.vatPercent) / 100);
    const totalAmountKrw = budgetTotalKrw + vatAmountKrw;
    return { budgetTotalKrw, vatAmountKrw, totalAmountKrw };
  };

  const getMaxPoints = (totalAmountKrw: number) => {
    if (budgetBalance === null) {
      return 0;
    }
    return Math.max(0, Math.min(budgetBalance, totalAmountKrw));
  };

  const normalizePointsApplied = (value: string, totalAmountKrw: number) => {
    if (!value || value.trim() === "") {
      return 0;
    }
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      return 0;
    }
    const maxPoints = getMaxPoints(totalAmountKrw);
    return Math.min(parsed, maxPoints);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userResponse = await fetch("/api/me");
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

        const balanceResponse = await fetch("/api/advertiser/budget/balance");
        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json();
          setBudgetBalance(balanceData.balanceKrw ?? 0);
        }
      } catch (error) {
        console.error("Failed to fetch review data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id]);

  const handlePointsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPointsAppliedValue(e.target.value);
  };

  const handlePointsBlur = (totalAmountKrw: number) => {
    const normalized = normalizePointsApplied(pointsAppliedValue, totalAmountKrw);
    setPointsAppliedValue(normalized.toString());
  };

  const handleConfirmPayment = async () => {
    if (!product) return;
    if (!placeId || !Number.isFinite(orderDays) || !Number.isFinite(dailyTarget)) {
      setSubmitError("결제 정보가 올바르지 않습니다.");
      return;
    }

    const startDate = getDateString(new Date());
    const endDate = getEndDateString(orderDays);
    const { totalAmountKrw } = getComputedAmounts();
    const pointsAppliedKrw = normalizePointsApplied(pointsAppliedValue, totalAmountKrw);

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/advertiser/product-orders/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          placeId,
          startDate,
          endDate,
          dailyTarget,
          paymentMethod,
          pointsAppliedKrw,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (data?.error === "pointsExceeded" && typeof data?.maxPoints === "number") {
          setSubmitError(`사용 가능한 최대 포인트는 ${data.maxPoints.toLocaleString()}원입니다.`);
        } else if (data?.error === "managerNotAllowed") {
          setSubmitError("매니저는 상품을 구매할 수 없습니다.");
        } else {
          setSubmitError("결제 준비 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        }
        return;
      }

      if (data?.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        setSubmitError("결제 이동에 실패했습니다. 다시 시도해주세요.");
      }
    } catch (error) {
      console.error("Failed to initialize payment:", error);
      setSubmitError("결제 준비 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageShell header={<AdvertiserHeader title="결제 확인" description="로딩 중..." currentUser={currentUser} />}>
        <Card>
          <CardBody className="text-center py-12">
            <div className="text-sm text-zinc-400">결제 정보를 불러오는 중...</div>
          </CardBody>
        </Card>
      </PageShell>
    );
  }

  if (!product || !placeId || !Number.isFinite(orderDays) || !Number.isFinite(dailyTarget)) {
    return (
      <PageShell header={<AdvertiserHeader title="결제 확인" description="정보가 올바르지 않습니다." currentUser={currentUser} />}>
        <Card>
          <CardBody className="space-y-4">
            <Callout tone="warning" title="결제 확인 불가">
              결제 정보를 찾을 수 없습니다. 다시 구매를 진행해주세요.
            </Callout>
            <Button onClick={() => router.push(`/advertiser/reward/products/${params.id}`)}>
              상품 페이지로 돌아가기
            </Button>
          </CardBody>
        </Card>
      </PageShell>
    );
  }

  const { budgetTotalKrw, vatAmountKrw, totalAmountKrw } = getComputedAmounts();
  const maxPoints = getMaxPoints(totalAmountKrw);
  const pointsAppliedKrw = normalizePointsApplied(pointsAppliedValue, totalAmountKrw);
  const payableAmountKrw = Math.max(0, totalAmountKrw - pointsAppliedKrw);
  const placeName = places.find((p) => p.id === placeId)?.name ?? "—";
  const startDate = getDateString(new Date());
  const endDate = getEndDateString(orderDays);

  return (
    <PageShell
      header={
        <AdvertiserHeader
          title="결제 확인"
          description={product.name}
          currentUser={currentUser}
        />
      }
    >
      <Card>
        <CardBody className="space-y-6">
          <div className="grid gap-3 text-sm text-zinc-300">
            <div className="flex justify-between">
              <span>상품</span>
              <span className="text-zinc-100">{product.name}</span>
            </div>
            <div className="flex justify-between">
              <span>플레이스</span>
              <span className="text-zinc-100">{placeName}</span>
            </div>
            <div className="flex justify-between">
              <span>주문 기간</span>
              <span className="text-zinc-100">
                {orderDays}일 ({startDate} ~ {endDate})
              </span>
            </div>
            <div className="flex justify-between">
              <span>일일 목표</span>
              <span className="text-zinc-100">{dailyTarget.toLocaleString()}개</span>
            </div>
            <div className="flex justify-between">
              <span>공급가</span>
              <span className="text-zinc-100">{budgetTotalKrw.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between">
              <span>VAT</span>
              <span className="text-zinc-100">{vatAmountKrw.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>결제 금액</span>
              <span className="text-zinc-50">{totalAmountKrw.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between">
              <span>결제 수단</span>
              <span className="text-zinc-100">{paymentMethod === "DEV" ? "DEV 즉시 반영" : "토스페이먼츠 카드 결제"}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="pointsApplied">포인트 사용</Label>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPointsAppliedValue(maxPoints.toString())}
                disabled={maxPoints <= 0}
              >
                전액 사용하기
              </Button>
            </div>
            <Input
              id="pointsApplied"
              type="number"
              min={0}
              max={maxPoints}
              step={100}
              placeholder="0"
              value={pointsAppliedValue}
              onChange={handlePointsChange}
              onBlur={() => handlePointsBlur(totalAmountKrw)}
            />
            <div className="text-xs text-zinc-400">
              사용 가능 포인트: {budgetBalance === null ? "조회 중..." : `${budgetBalance.toLocaleString()}P`} ·
              최대 적용: {maxPoints.toLocaleString()}P
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-100">
            <div className="flex justify-between">
              <span>포인트 적용</span>
              <span>-{pointsAppliedKrw.toLocaleString()}P</span>
            </div>
            <div className="mt-2 flex justify-between font-semibold text-zinc-50">
              <span>최종 결제 금액</span>
              <span>{payableAmountKrw.toLocaleString()}원</span>
            </div>
          </div>

          {submitError && (
            <Callout tone="warning" title="결제 준비 오류">
              {submitError}
            </Callout>
          )}

          <Button
            className="w-full"
            variant="primary"
            onClick={handleConfirmPayment}
            disabled={isSubmitting}
          >
            결제하기
          </Button>
        </CardBody>
      </Card>
    </PageShell>
  );
}

