'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardBody } from '@/app/_ui/primitives';

// Load Toss Payments SDK dynamically
const loadTossPaymentsSDK = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.TossPayments) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.tosspayments.com/v1/payment';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Toss Payments SDK'));
    document.head.appendChild(script);
  });
};

export default function TossPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // For development: simulate payment
  const simulatePayment = () => {
    const orderId = searchParams.get('orderId');
    const amount = searchParams.get('amount');

    if (!orderId || !amount) {
      setError('결제 정보가 올바르지 않습니다.');
      setIsLoading(false);
      return;
    }

    console.log('Simulating payment success...');
    setTimeout(() => {
      window.location.href = `${window.location.origin}/advertiser/billing/toss/success?orderId=${orderId}&paymentKey=test_payment_key_${Date.now()}&amount=${amount}`;
    }, 2000);
  };

  useEffect(() => {
    const initializePayment = async () => {
      try {
        // Get payment parameters from URL
        const orderId = searchParams.get('orderId');
        const amount = searchParams.get('amount');
        const orderName = searchParams.get('orderName');

        if (!orderId || !amount || !orderName) {
          setError('결제 정보가 올바르지 않습니다.');
          setIsLoading(false);
          return;
        }

        // Get client key from environment
        const clientKey = process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY;
        if (!clientKey) {
          setError('결제 설정이 올바르지 않습니다.');
          setIsLoading(false);
          return;
        }

        // Use simulation in development
        if (process.env.NODE_ENV === 'development') {
          simulatePayment();
          return;
        }

        // Load SDK for production
        await loadTossPaymentsSDK();

        if (!window.TossPayments) {
          throw new Error('TossPayments SDK 로드 실패');
        }

        // Initialize and request payment
        const tossPayments = window.TossPayments(clientKey);
        const payment = tossPayments.payment({ customerKey: 'anonymous' });
        const paymentAmount = parseInt(amount);

        await payment.requestPayment({
          method: 'CARD',
          amount: { currency: 'KRW', value: paymentAmount },
          orderId,
          orderName,
          successUrl: `${window.location.origin}/advertiser/billing/toss/success`,
          failUrl: `${window.location.origin}/advertiser/billing/toss/fail?orderId=${orderId}`,
        });

      } catch (err) {
        console.error('Payment initialization error:', err);
        const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';
        setError(`결제 초기화 중 오류가 발생했습니다: ${errorMessage}`);
        setIsLoading(false);
      }
    };

    initializePayment();
  }, [searchParams]);

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <Card>
          <CardBody className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-400/10 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-zinc-50">결제 오류</h2>
            <p className="text-zinc-400">{error}</p>
            <button
              onClick={() => router.push('/advertiser/billing')}
              className="px-4 py-2 bg-zinc-700 text-zinc-50 rounded-lg hover:bg-zinc-600 transition-colors"
            >
              결제 페이지로 돌아가기
            </button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <Card>
        <CardBody className="text-center space-y-4">
          <div className="w-16 h-16 bg-cyan-400/10 rounded-full flex items-center justify-center mx-auto">
            <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-xl font-semibold text-zinc-50">결제 진행 중</h2>
          <p className="text-zinc-400">토스페이먼츠로 이동하는 중입니다...</p>
        </CardBody>
      </Card>
    </div>
  );
}