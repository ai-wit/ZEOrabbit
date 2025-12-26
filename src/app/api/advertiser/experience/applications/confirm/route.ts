import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/server/auth/require-user';
import { prisma } from '@/server/prisma';
import { getAdvertiserProfileIdByUserId } from '@/server/advertiser/advertiser-profile';
import { confirmTossPayment } from '@/server/toss-payments';

const Schema = z.object({
  applicationId: z.string().min(1),
  paymentKey: z.string().optional(),
  orderId: z.string().optional(),
  amount: z.coerce.number().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole('ADVERTISER');
    const advertiserId = await getAdvertiserProfileIdByUserId(user.id);

    const json = await req.json();
    const parsed = Schema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { applicationId, paymentKey, orderId, amount } = parsed.data;

    // ExperienceApplication 확인
    const application = await prisma.experienceApplication.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        advertiserId: true,
        paymentId: true,
        status: true,
        paymentMethod: true,
        pricingPlan: {
          select: {
            priceKrw: true,
            displayName: true
          }
        }
      }
    });

    if (!application) {
      return NextResponse.json(
        { error: '체험단 신청서를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (application.advertiserId !== advertiserId) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      );
    }

    if (application.status !== 'PAYMENT_INFO_COMPLETED') {
      return NextResponse.json(
        { error: '결제 정보가 완료되지 않았습니다.' },
        { status: 400 }
      );
    }

    // 결제 처리
    if (application.paymentMethod === 'BANK_TRANSFER') {
      // 무통장 입금의 경우 별도 처리 필요 (관리자 확인 후)
      return NextResponse.json(
        { error: '무통장 입금의 경우 관리자 확인 후 처리됩니다.' },
        { status: 400 }
      );
    } else if (application.paymentMethod === 'CARD') {
      // 카드 결제 확인
      if (!paymentKey || !orderId || !amount) {
        return NextResponse.json(
          { error: '결제 정보가 올바르지 않습니다.' },
          { status: 400 }
        );
      }

      // Payment 레코드 확인
      const payment = await prisma.payment.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          status: true,
          amountKrw: true,
          experienceApplication: {
            select: { id: true, placeType: true }
          }
        }
      });

      if (!payment) {
        return NextResponse.json(
          { error: '결제 정보를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      if (payment.status === 'PAID') {
        // 이미 결제 완료된 경우
        await prisma.experienceApplication.update({
          where: { id: applicationId },
          data: {
            status: 'PAYMENT_COMPLETED',
            completedAt: new Date()
          }
        });

        return NextResponse.json({
          success: true,
          application: {
            id: applicationId,
            status: 'PAYMENT_COMPLETED',
            pricingPlan: application.pricingPlan
          }
        });
      }

      // 개발 환경에서는 결제 확인 생략
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: simulating experience payment confirmation');
      } else {
        // 토스페이먼츠 결제 확인
        const tossResponse = await confirmTossPayment({
          paymentKey,
          orderId,
          amount
        });

        if (tossResponse.status !== 'DONE') {
          return NextResponse.json(
            { error: '결제가 완료되지 않았습니다.', status: tossResponse.status },
            { status: 400 }
          );
        }
      }

      // 트랜잭션으로 결제 완료 처리
      await prisma.$transaction(async (tx) => {
        // Payment 상태 업데이트
        await tx.payment.update({
          where: { id: orderId },
          data: {
            status: 'PAID',
            providerRef: paymentKey,
            updatedAt: new Date(),
          }
        });

        // ExperienceApplication 상태 업데이트
        await tx.experienceApplication.update({
          where: { id: applicationId },
          data: {
            status: 'PAYMENT_COMPLETED',
            completedAt: new Date()
          }
        });

        // 예산 증가 (선택사항 - 체험단 신청의 경우 즉시 예산 증가하지 않을 수 있음)
        // 필요에 따라 활성화
        /*
        await tx.budgetLedger.create({
          data: {
            advertiserId,
            amountKrw: application.pricingPlan.priceKrw,
            reason: 'EXPERIENCE_APPLICATION',
            refId: applicationId,
            createdAt: new Date(),
          }
        });
        */

        // 감사 로그
        await tx.auditLog.create({
          data: {
            actorUserId: user.id,
            action: 'EXPERIENCE_APPLICATION_PAYMENT_COMPLETED',
            targetType: 'ExperienceApplication',
            targetId: applicationId,
            payloadJson: {
              paymentId: orderId,
              amount: application.pricingPlan.priceKrw,
              paymentMethod: 'CARD'
            }
          }
        });
      });

      return NextResponse.json({
        success: true,
        application: {
          id: applicationId,
          placeType: payment.experienceApplication.placeType,
          status: 'PAYMENT_COMPLETED',
          pricingPlan: application.pricingPlan
        },
        payment: {
          id: orderId,
          amount: application.pricingPlan.priceKrw,
          status: 'PAID'
        }
      });
    }

    return NextResponse.json(
      { error: '지원하지 않는 결제 방식입니다.' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Experience application payment confirmation error:', error);
    return NextResponse.json(
      { error: '결제 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
