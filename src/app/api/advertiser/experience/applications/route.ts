import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/server/auth/require-user';
import { getAdvertiserProfileIdByUserId } from '@/server/advertiser/advertiser-profile';
import { prisma } from '@/server/prisma';
import { z } from 'zod';

const createApplicationSchema = z.object({
  placeType: z.enum(['OPENING_SOON', 'OPERATING']),
  pricingPlanId: z.string(),
  termsAgreed: z.boolean(),
});

const updateApplicationSchema = z.object({
  step: z.number().min(1).max(6),
  data: z.record(z.any()),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('ADVERTISER');
    const advertiserId = await getAdvertiserProfileIdByUserId(user.id);

    const body = await request.json();
    const validation = createApplicationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: '유효하지 않은 요청 데이터입니다.' },
        { status: 400 }
      );
    }

    const { placeType, pricingPlanId, termsAgreed } = validation.data;

    // 요금제 존재 확인
    const pricingPlan = await prisma.experiencePricingPlan.findUnique({
      where: { id: pricingPlanId },
    });

    if (!pricingPlan || pricingPlan.placeType !== placeType || !pricingPlan.isActive) {
      return NextResponse.json(
        { error: '유효하지 않은 요금제입니다.' },
        { status: 400 }
      );
    }

    // 이미 진행 중인 신청이 있는지 확인
    const existingApplication = await prisma.experienceApplication.findFirst({
      where: {
        advertiserId,
        status: {
          notIn: ['COMPLETED', 'CANCELLED'],
        },
      },
    });

    if (existingApplication) {
      return NextResponse.json(
        { error: '이미 진행 중인 신청이 있습니다.' },
        { status: 400 }
      );
    }

    // 신청 생성
    const application = await prisma.experienceApplication.create({
      data: {
        advertiserId,
        placeType,
        pricingPlanId,
        status: 'BASIC_INFO_COMPLETED',
        termsAgreed,
        termsAgreedAt: termsAgreed ? new Date() : null,
      },
    });

    return NextResponse.json({
      id: application.id,
      status: application.status,
    });
  } catch (error) {
    console.error('체험단 신청 생성 오류:', error);
    return NextResponse.json(
      { error: '신청 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireRole('ADVERTISER');
    const advertiserId = await getAdvertiserProfileIdByUserId(user.id);

    const body = await request.json();
    const validation = updateApplicationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: '유효하지 않은 요청 데이터입니다.' },
        { status: 400 }
      );
    }

    const { step, data } = validation.data;

    // 진행 중인 신청 찾기
    const application = await prisma.experienceApplication.findFirst({
      where: {
        advertiserId,
        status: {
          notIn: ['COMPLETED', 'CANCELLED'],
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: '진행 중인 신청을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 단계별 업데이트 로직
    let updateData: any = {};
    let newStatus: string = application.status;

    switch (step) {
      case 2: // 요금제 선택 완료
        newStatus = 'PRICING_SELECTED';
        break;

      case 3: // 결제 정보 입력 완료
        updateData = {
          paymentMethod: data.paymentMethod,
          taxInvoiceRequested: data.taxInvoiceRequested,
          taxInvoiceInfo: data.taxInvoiceRequested ? data.taxInvoiceInfo : null,
        };
        newStatus = 'PAYMENT_INFO_COMPLETED';
        break;

      case 4: // 결제 완료 (실제로는 결제 시스템에서 처리)
        // 실제 구현에서는 결제 성공 후에만 이 단계로 진행
        newStatus = 'PAYMENT_COMPLETED';
        break;

      case 5: // 추가 정보 입력 완료
        updateData = {
          businessName: data.businessName,
          openingDate: data.openingDate ? new Date(data.openingDate) : null,
          shootingStartDate: data.shootingStartDate ? new Date(data.shootingStartDate) : null,
          currentRanking: data.currentRanking,
          monthlyTeamCapacity: data.monthlyTeamCapacity,
          address: data.address,
          representativeMenu: data.representativeMenu,
          localMomBenefit: data.localMomBenefit,
          contactPhone: data.contactPhone,
        };
        newStatus = 'ADDITIONAL_INFO_COMPLETED';
        break;

      case 6: // 신청 완료
        updateData = {
          status: 'COMPLETED',
          completedAt: new Date(),
        };
        newStatus = 'COMPLETED';
        break;
    }

    // 신청 업데이트
    const updatedApplication = await prisma.experienceApplication.update({
      where: { id: application.id },
      data: {
        ...updateData,
        status: newStatus,
      },
    });

    return NextResponse.json({
      id: updatedApplication.id,
      status: updatedApplication.status,
    });
  } catch (error) {
    console.error('체험단 신청 업데이트 오류:', error);
    return NextResponse.json(
      { error: '신청 업데이트에 실패했습니다.' },
      { status: 500 }
    );
  }
}
