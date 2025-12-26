'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardBody, Button } from '@/app/_ui/primitives';

interface PaymentResult {
  success: boolean;
  payment?: {
    id: string;
    amount: number;
    status: string;
  };
  error?: string;
}

export default function TossPaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [isConfirming, setIsConfirming] = useState(true);

  useEffect(() => {
    const confirmPayment = async () => {
      try {
        const paymentKey = searchParams.get('paymentKey');
        const orderId = searchParams.get('orderId');
        const amount = searchParams.get('amount');

        if (!orderId || !amount) {
          setResult({
            success: false,
            error: '결제 정보가 올바르지 않습니다.'
          });
          setIsConfirming(false);
          return;
        }

        // For development: simulate successful confirmation
        if (process.env.NODE_ENV === 'development') {
          console.log('Development mode: simulating payment confirmation');

          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 1000));

          setResult({
            success: true,
            payment: {
              id: orderId,
              amount: parseInt(amount),
              status: 'PAID'
            }
          });
          setIsConfirming(false);
          return;
        }

        // Production: confirm payment with API
        if (!paymentKey) {
          setResult({
            success: false,
            error: '결제 정보가 올바르지 않습니다.'
          });
          setIsConfirming(false);
          return;
        }

        const response = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: parseInt(amount)
          })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setResult({ success: true, payment: data.payment });
        } else {
          setResult({
            success: false,
            error: data.error || '결제 확인 중 오류가 발생했습니다.'
          });
        }

      } catch (error) {
        console.error('Payment confirmation error:', error);
        setResult({
          success: false,
          error: '결제 확인 중 오류가 발생했습니다.'
        });
      } finally {
        setIsConfirming(false);
      }
    };

    confirmPayment();
  }, [searchParams]);

  if (isConfirming) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <Card>
          <CardBody className="text-center space-y-4">
            <div className="w-16 h-16 bg-cyan-400/10 rounded-full flex items-center justify-center mx-auto">
              <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2 className="text-xl font-semibold text-zinc-50">결제 확인 중</h2>
            <p className="text-zinc-400">결제를 확인하고 예산을 충전하는 중입니다...</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!result?.success) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <Card>
          <CardBody className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-400/10 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-zinc-50">결제 확인 실패</h2>
            <p className="text-zinc-400">{result?.error || '알 수 없는 오류가 발생했습니다.'}</p>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => window.location.reload()}
                variant="secondary"
              >
                다시 시도
              </Button>
              <Button
                onClick={() => router.push('/advertiser/billing')}
              >
                결제 페이지로 돌아가기
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <Card>
        <CardBody className="text-center space-y-6">
          <div className="w-16 h-16 bg-green-400/10 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-zinc-50 mb-2">결제 완료</h2>
            <p className="text-zinc-400">충전이 성공적으로 완료되었습니다.</p>
          </div>

          <div className="bg-green-400/10 border border-green-400/20 p-6 rounded-lg">
            <div className="text-sm text-green-100 font-medium mb-2">충전 완료 금액</div>
            <div className="text-3xl font-bold text-zinc-50">
              {result.payment?.amount?.toLocaleString()}원
            </div>
            <div className="text-sm text-zinc-400 mt-2">
              결제 ID: {result.payment?.id}
            </div>
          </div>

          <div className="text-sm text-zinc-400 space-y-1">
            <p>충전된 금액은 즉시 광고 예산으로 사용할 수 있습니다.</p>
            <p>결제 내역은 결제/충전 페이지에서 확인하실 수 있습니다.</p>
          </div>

          <div className="flex gap-3 justify-center">
            <Link href="/advertiser/billing">
              <Button>
                결제/충전 페이지로 이동
              </Button>
            </Link>
            <Link href="/advertiser/campaigns">
              <Button variant="secondary">
                캠페인 생성하기
              </Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
