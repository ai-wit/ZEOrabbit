'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardBody, Button } from '@/app/_ui/primitives';
import { getPaymentStatusLabel } from "@/lib/status-labels";

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
  const productId = searchParams.get('productId');
  const returnPath = productId ? `/advertiser/reward/products/${productId}` : '/advertiser/billing';

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

        // For product orders, wait a bit for webhook to arrive
        if (orderId.startsWith('prd_')) {
          console.log('Waiting for webhook to process payment...');
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        }

        // 체험단 결제인지 일반 충전 결제인지 구분
        const isExperiencePayment = orderId.startsWith('exp_');
        const isProductOrderPayment = orderId.startsWith('prd_');

        if (isExperiencePayment) {
          // 체험단 결제의 경우 체험단 결제 확인 API 사용
          const parts = orderId.split('_');
          const applicationId = parts[1]; // exp_{applicationId}_{timestamp}_{random}

          const response = await fetch('/api/advertiser/experience/applications/confirm', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              applicationId,
              paymentKey,
              orderId,
              amount: parseInt(amount)
            })
          });

          const data = await response.json();

          if (response.ok && data.success) {
            // 체험단 결제 성공 시 결제 정보를 포함해서 체험단 신청 페이지로 리다이렉트
            // 결제 완료 화면(Step 4)을 먼저 보여주기 위해 step=4로 설정
            // paymentCompleted=true로 결제 완료 상태임을 표시
            const params = new URLSearchParams({
              step: '4',
              paymentCompleted: 'true',
              paymentId: data.payment.id,
              paymentAmount: data.payment.amount.toString(),
              paymentStatus: data.payment.status,
              applicationId: data.application.id,
              placeType: data.application.placeType,
              pricingPlanId: data.application.pricingPlan?.id || '',
              pricingPlanName: data.application.pricingPlan?.displayName || ''
            });
            window.location.href = `/advertiser/experience/new?${params.toString()}`;
            return;
          } else {
            setResult({
              success: false,
              error: data.error || '결제 확인 중 오류가 발생했습니다.'
            });
          }
        } else {
          if (isProductOrderPayment) {
            const response = await fetch('/api/advertiser/product-orders/confirm', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                paymentKey,
                orderId,
                amount: parseInt(amount),
              }),
            });

            const data = await response.json();
            if (response.ok && data.success) {
              setResult({
                success: true,
                payment: {
                  id: orderId,
                  amount: parseInt(amount),
                  status: 'PAID',
                }
              });
              setIsConfirming(false);
              return;
            }

            setResult({
              success: false,
              error: data.error || '결제 확인 중 오류가 발생했습니다.',
            });
            return;
          }

          // 일반 충전 결제
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
                onClick={() => router.push(returnPath)}
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
            <p className="text-zinc-400">
              결제가 성공적으로 완료되었습니다.
            </p>
          </div>

          <div className="bg-green-400/10 border border-green-400/20 p-6 rounded-lg">
            <div className="text-sm text-green-100 font-medium mb-2">충전 완료 금액</div>
            <div className="text-3xl font-bold text-zinc-50">
              {result.payment?.amount?.toLocaleString()}원
            </div>
            <div className="text-sm text-zinc-400 mt-2">
              결제 ID: {result.payment?.id}
            </div>
              <div className="text-sm text-zinc-400 mt-1">
                결제 상태: {result.payment?.status ? getPaymentStatusLabel(result.payment.status) : "—"}
              </div>
          </div>

          <div className="text-sm text-zinc-400 space-y-1">
            <p>구매 내역을 기반으로 매니저가 캠페인을 등록/활성화하면 집행이 시작됩니다.</p>
            <p>결제 내역은 결제/충전 페이지에서 확인하실 수 있습니다.</p>
          </div>

          <div className="flex gap-3 justify-center">
            <Link href="/advertiser/reward/campaigns">
              <Button>집행 현황 보기</Button>
            </Link>
            <Link href="/advertiser/reward/products">
              <Button variant="secondary">상품 보러가기</Button>
            </Link>
            <Link href="/advertiser/billing">
              <Button variant="secondary">결제/충전</Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
