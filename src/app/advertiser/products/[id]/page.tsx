'use client';

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageShell } from "@/app/_ui/shell";
import { Button, Card, CardBody, Hint, Input, Label, Select, Callout } from "@/app/_ui/primitives";
import { AdvertiserHeader } from "../../_components/AdvertiserHeader";
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

  useEffect(() => {
    const fetchData = async () => {
      try {
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

  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case 'minDays':
        return '최소 주문 기간보다 짧습니다. 기간을 늘려주세요.';
      case 'invalidDates':
        return '시작일과 종료일이 올바르지 않습니다.';
      case 'insufficientBudget':
        return '예산이 부족합니다. 충전 후 다시 시도해주세요.';
      case 'placeNotFound':
        return '선택한 플레이스를 찾을 수 없습니다.';
      case 'productNotFound':
        return '상품을 찾을 수 없습니다.';
      default:
        return errorCode ? `오류가 발생했습니다: ${errorCode}` : null;
    }
  };

  if (loading) {
    return (
      <PageShell header={<AdvertiserHeader title="상품" description="로딩 중..." />}>
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
        header={<AdvertiserHeader title="상품" description="상품을 찾을 수 없습니다." />}
      >
        <Card>
          <CardBody className="space-y-4">
            <div className="text-sm text-zinc-300">상품이 없거나 비활성화되었습니다.</div>
            <Link href="/advertiser/products" className="text-sm text-zinc-300 hover:underline underline-offset-4">
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
        />
      }
    >
      <div className="space-y-8">
        {error && (
          <Callout tone="red" title="구매 실패">
            {getErrorMessage(error)}
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

                <div className="space-y-2">
                  <Label htmlFor="placeId">플레이스</Label>
                  <Select id="placeId" name="placeId" required>
                    {places.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">시작일</Label>
                    <DateInput id="startDate" name="startDate" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">종료일</Label>
                    <DateInput id="endDate" name="endDate" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dailyTarget">일일 목표 수량</Label>
                  <Input id="dailyTarget" name="dailyTarget" type="number" required min={1} step={1} placeholder="예: 150" />
                  <Hint>최소 주문 기간은 {product.minOrderDays}일입니다. (기간이 짧으면 결제가 진행되지 않습니다)</Hint>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">결제 수단</Label>
                  <Select id="paymentMethod" name="paymentMethod" required>
                    <option value="TOSS">토스페이먼츠 카드 결제</option>
                    <option value="DEV">DEV 즉시 반영 (개발용)</option>
                  </Select>
                </div>

                <Button type="submit" variant="primary" className="w-full">
                  결제하고 캠페인 시작하기
                </Button>
              </form>
            )}
          </CardBody>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Link href="/advertiser/products" className="text-sm text-zinc-300 hover:underline underline-offset-4">
            ← 상품 목록
          </Link>
          <Link href="/advertiser/campaigns" className="text-sm text-zinc-300 hover:underline underline-offset-4">
            집행 현황(캠페인) 보기 →
          </Link>
        </div>
      </div>
    </PageShell>
  );
}