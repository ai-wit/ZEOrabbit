import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/server/auth/require-user';
import { prisma } from '@/server/prisma';
import { getAdvertiserProfileIdByUserId } from '@/server/advertiser/advertiser-profile';

// 세금을 포함한 총 금액 계산 함수
function calculateTotalAmount(priceKrw: number, taxPercent: number): number {
  const taxAmount = Math.round(priceKrw * taxPercent / 100);
  return priceKrw + taxAmount;
}

const Schema = z.object({
  pricingPlanId: z.string().min(1),
  placeType: z.enum(['OPENING_SOON', 'OPERATING']),
  paymentMethod: z.enum(['CARD', 'BANK_TRANSFER']),
  taxInvoiceRequested: z.boolean().default(false),
  // 기본 정보
  businessName: z.string().optional(),
  openingDate: z.string().optional(),
  shootingStartDate: z.string().optional(),
  currentRanking: z.string().optional(),
  monthlyTeamCapacity: z.coerce.number().optional(),
  address: z.string().optional(),
  representativeMenu: z.string().optional(),
  localMomBenefit: z.string().optional(),
  contactPhone: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    console.log('체험단 신청 API 호출됨');

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

    const {
      pricingPlanId,
      placeType,
      paymentMethod,
      taxInvoiceRequested,
      ...additionalInfo
    } = parsed.data;

    // 요금제 확인 (하드코딩된 데이터에서 찾기)
    const hardcodedPlans = [
      { id: 'opening-basic', name: 'Basic', displayName: 'Basic 29만원', priceKrw: 290000, taxPercent: 10 },
      { id: 'opening-pro', name: 'Pro', displayName: 'Pro 49만원', priceKrw: 490000, taxPercent: 10 },
      { id: 'opening-vip', name: 'VIP', displayName: 'VIP 79만원', priceKrw: 790000, taxPercent: 10 },
      { id: 'operating-basic', name: 'Basic', displayName: '① 29만원 (실속형)', priceKrw: 290000, taxPercent: 10 },
      { id: 'operating-tech', name: 'Tech', displayName: '② 49만원 A (기술형)', priceKrw: 490000, taxPercent: 10 },
      { id: 'operating-volume', name: 'Volume', displayName: '③ 49만원 B (물량형)', priceKrw: 490000, taxPercent: 10 },
      { id: 'operating-vip', name: 'VIP', displayName: '④ 79만원 (VIP형)', priceKrw: 790000, taxPercent: 10 },
    ];

    const pricingPlan = hardcodedPlans.find(plan => plan.id === pricingPlanId);

    if (!pricingPlan) {
      return NextResponse.json(
        { error: '요금제를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 광고주의 장소 확인 (임시로 첫 번째 장소 사용)
    let place = await prisma.place.findFirst({
      where: { advertiserId },
      select: { id: true }
    });

    // 테스트용으로 장소가 없으면 임시 장소 생성
    if (!place) {
      place = await prisma.place.create({
        data: {
          advertiserId,
          name: '테스트 매장',
        },
        select: { id: true }
      });
    }

    console.log('ExperienceApplication 생성 시도');

    // 테스트용 요금제 데이터 생성 (없으면)
    let existingPlan = await prisma.experiencePricingPlan.findUnique({
      where: { id: pricingPlanId }
    });

    if (!existingPlan) {
      // placeType과 name의 조합으로 이미 존재하는지 확인
      existingPlan = await prisma.experiencePricingPlan.findFirst({
        where: {
          placeType: placeType,
          name: pricingPlan.name
        }
      });

      if (!existingPlan) {
        existingPlan = await prisma.experiencePricingPlan.create({
          data: {
            id: pricingPlanId,
            placeType: placeType,
            name: pricingPlan.name,
            displayName: pricingPlan.displayName,
            priceKrw: pricingPlan.priceKrw,
            // taxPercent: pricingPlan.taxPercent || 10, // TODO: AWS 배포 시 활성화
            description: '',
            teamCount: 1,
            leaderLevel: 'Lv1',
            reviewCount: 25,
            hasRankingBoost: false,
            trafficTarget: 3000,
            saveTarget: 100,
          } as any // 임시: 타입 에러 우회
        });
      }
    }

    // ExperienceApplication 생성
    const application = await prisma.experienceApplication.create({
      data: {
        advertiserId,
        placeType,
        pricingPlanId: existingPlan.id,
        status: 'PAYMENT_INFO_COMPLETED',
        paymentMethod,
        taxInvoiceRequested,
        // 추가 정보 (스키마에 있는 필드만)
        businessName: additionalInfo.businessName,
        openingDate: additionalInfo.openingDate ? new Date(additionalInfo.openingDate) : null,
        shootingStartDate: additionalInfo.shootingStartDate ? new Date(additionalInfo.shootingStartDate) : null,
      },
      select: {
        id: true,
        pricingPlan: {
          select: {
            displayName: true,
            priceKrw: true
          }
        }
      }
    });

    console.log('ExperienceApplication 생성됨:', application.id);

    // 결제 생성 (BANK_TRANSFER의 경우 즉시 완료, CARD의 경우 토스페이먼츠)
    const totalAmount = calculateTotalAmount(pricingPlan.priceKrw, pricingPlan.taxPercent);
    let payment;
    if (paymentMethod === 'BANK_TRANSFER') {
      // 무통장 입금의 경우 즉시 결제 완료로 처리
      payment = await prisma.payment.create({
        data: {
          advertiserId,
          amountKrw: totalAmount,
          status: 'CREATED', // 실제로는 관리자가 확인 후 PAID로 변경
          provider: 'BANK_TRANSFER',
          providerRef: `bank_${Date.now()}`,
        },
        select: { id: true, amountKrw: true, status: true }
      });
    } else if (paymentMethod === 'CARD') {
      // 카드 결제의 경우 토스페이먼츠 결제 준비 (applicationId 포함)
      const orderId = `exp_${application.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      payment = await prisma.payment.create({
        data: {
          id: orderId,
          advertiserId,
          amountKrw: totalAmount,
          status: 'CREATED',
          provider: 'TOSS',
          providerRef: orderId,
        },
        select: { id: true, amountKrw: true, status: true }
      });

      // ExperienceApplication에 payment 연결
      await prisma.experienceApplication.update({
        where: { id: application.id },
        data: { paymentId: payment.id }
      });
    }

    return NextResponse.json({
      success: true,
      application: {
        id: application.id,
        placeType: placeType,
        pricingPlan: application.pricingPlan,
      },
      payment: payment ? {
        id: payment.id,
        amount: payment.amountKrw,
        status: payment.status,
        method: paymentMethod
      } : null
    });

  } catch (error) {
    console.error('Experience application creation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', errorMessage, errorStack);
    return NextResponse.json(
      { error: `체험단 신청 처리 중 오류가 발생했습니다: ${errorMessage}` },
      { status: 500 }
    );
  }
}