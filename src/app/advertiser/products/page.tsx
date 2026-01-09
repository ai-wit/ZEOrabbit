'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Card, CardBody } from "@/app/_ui/primitives";
import { AdvertiserHeader } from "../_components/AdvertiserHeader";

type Product = {
  id: string;
  name: string;
  missionType: string;
  unitPriceKrw: number;
  vatPercent: number;
  minOrderDays: number;
  marketingCopy: string | null;
  createdAt: string;
};

export default function AdvertiserProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/advertiser/products');
        if (response.ok) {
          const data = await response.json();
          setProducts(data.products);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) {
    return (
      <PageShell header={<AdvertiserHeader title="상품" description="로딩 중..." />}>
        <Card>
          <CardBody className="text-center py-12">
            <div className="text-sm text-zinc-400">상품 목록을 불러오는 중...</div>
          </CardBody>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      header={
        <AdvertiserHeader
          title="상품"
          description={`${products.length}개의 상품이 있습니다.`}
        />
      }
    >
      <div className="space-y-6">
        {products.length === 0 ? (
          <Card>
            <CardBody className="text-center py-12">
              <div className="text-sm text-zinc-400">등록된 상품이 없습니다.</div>
            </CardBody>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow">
                <CardBody className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-zinc-50">{product.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <span className="px-2 py-1 bg-zinc-800 rounded text-xs">{product.missionType}</span>
                      <span>최소 {product.minOrderDays}일</span>
                    </div>
                  </div>

                  <div className="text-xl font-bold text-zinc-50">
                    {product.unitPriceKrw.toLocaleString()}원/일
                  </div>

                  {product.marketingCopy && (
                    <p className="text-sm text-zinc-300 line-clamp-2">
                      {product.marketingCopy}
                    </p>
                  )}

                  <ButtonLink href={`/advertiser/products/${product.id}`} variant="primary" className="w-full">
                    구매하기
                  </ButtonLink>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Link href="/advertiser" className="text-sm text-zinc-300 hover:underline underline-offset-4">
            ← 광고주 대시보드
          </Link>
          <Link href="/advertiser/campaigns" className="text-sm text-zinc-300 hover:underline underline-offset-4">
            집행 현황(캠페인) 보기 →
          </Link>
        </div>
      </div>
    </PageShell>
  );
}