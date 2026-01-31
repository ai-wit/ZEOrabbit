'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardBody, Button } from '@/app/_ui/primitives';

interface PaymentFailure {
  code?: string;
  message?: string;
  orderId?: string;
}

export default function TossPaymentFailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [failure, setFailure] = useState<PaymentFailure>({});
  const productId = searchParams.get('productId');
  const returnPath = productId ? `/advertiser/reward/products/${productId}` : '/advertiser/billing';
  const returnLabel = productId ? '결제 페이지로 돌아가기' : '결제/충전 페이지로 이동';

  useEffect(() => {
    // Extract failure information from URL parameters
    const code = searchParams.get('code');
    const message = searchParams.get('message');
    const orderId = searchParams.get('orderId');

    setFailure({
      code: code || undefined,
      message: message || undefined,
      orderId: orderId || undefined,
    });

    if (orderId && orderId.startsWith('prd_')) {
      fetch('/api/advertiser/product-orders/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      }).catch((error) => {
        console.error('Failed to cancel product order:', error);
      });
    }
  }, [searchParams]);

  const getErrorMessage = (code?: string, message?: string) => {
    if (message) return message;

    switch (code) {
      case 'USER_CANCEL':
        return '사용자가 결제를 취소했습니다.';
      case 'PAYMENT_CANCEL':
        return '결제가 취소되었습니다.';
      case 'PAYMENT_NOT_FOUND':
        return '결제 정보를 찾을 수 없습니다.';
      case 'PAYMENT_ALREADY_PROCESSED':
        return '이미 처리된 결제입니다.';
      case 'CARD_ERROR':
        return '카드 정보가 올바르지 않습니다.';
      case 'INSUFFICIENT_FUNDS':
        return '잔액이 부족합니다.';
      default:
        return '결제 처리 중 오류가 발생했습니다.';
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <Card>
        <CardBody className="text-center space-y-6">
          <div className="w-16 h-16 bg-red-400/10 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-zinc-50 mb-2">결제 실패</h2>
            <p className="text-zinc-400">결제 처리에 실패했습니다.</p>
          </div>

          <div className="bg-red-400/10 border border-red-400/20 p-6 rounded-lg">
            <div className="text-sm text-red-100 font-medium mb-2">실패 사유</div>
            <div className="text-zinc-50 font-medium">
              {getErrorMessage(failure.code, failure.message)}
            </div>
            {failure.orderId && (
              <div className="text-sm text-zinc-400 mt-2">
                주문 ID: {failure.orderId}
              </div>
            )}
          </div>

          <div className="text-sm text-zinc-400 space-y-1">
            <p>문제가 지속되면 고객센터로 문의해주세요.</p>
            <p>결제 수단이나 네트워크 상태를 확인하고 다시 시도하실 수 있습니다.</p>
          </div>

          <div className="flex gap-3 justify-center">
            <Link href={returnPath}>
              <Button>
                {returnLabel}
              </Button>
            </Link>
            <Button
              variant="secondary"
              onClick={() => router.back()}
            >
              이전 페이지로 돌아가기
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
