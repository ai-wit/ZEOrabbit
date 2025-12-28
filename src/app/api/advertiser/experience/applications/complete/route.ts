import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/server/auth/require-user';
import { prisma } from '@/server/prisma';
import { getAdvertiserProfileIdByUserId } from '@/server/advertiser/advertiser-profile';

const Schema = z.object({
  applicationId: z.string().min(1),
  additionalInfo: z.object({
    businessName: z.string().optional(),
    openingDate: z.string().optional(),
    shootingStartDate: z.string().optional(),
    currentRanking: z.string().optional(),
    monthlyTeamCapacity: z.string().optional(),
    address: z.string().optional(),
    representativeMenu: z.string().optional(),
    localMomBenefit: z.string().optional(),
    contactPhone: z.string().optional(),
  }),
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

    const { applicationId, additionalInfo } = parsed.data;

    // ExperienceApplication 확인 및 업데이트
    const application = await prisma.experienceApplication.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        advertiserId: true,
        status: true,
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

    if (application.status !== 'PAYMENT_COMPLETED') {
      return NextResponse.json(
        { error: '결제가 완료되지 않았습니다.' },
        { status: 400 }
      );
    }

    // 추가 정보 업데이트 및 상태 변경
    const updatedApplication = await prisma.experienceApplication.update({
      where: { id: applicationId },
      data: {
        ...additionalInfo,
        monthlyTeamCapacity: additionalInfo.monthlyTeamCapacity ? parseInt(additionalInfo.monthlyTeamCapacity) : null,
        openingDate: additionalInfo.openingDate ? new Date(additionalInfo.openingDate) : null,
        shootingStartDate: additionalInfo.shootingStartDate ? new Date(additionalInfo.shootingStartDate) : null,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        completedAt: true,
      }
    });

    return NextResponse.json({
      success: true,
      application: updatedApplication,
    });

  } catch (error) {
    console.error('Complete experience application error:', error);
    return NextResponse.json(
      { error: '체험단 신청 완료 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
