import { NextResponse } from 'next/server';
import { requireRole } from '@/server/auth/require-user';
import { getAdvertiserProfileIdByUserId } from '@/server/advertiser/advertiser-profile';
import { prisma } from '@/server/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireRole('ADVERTISER');
    const advertiserId = await getAdvertiserProfileIdByUserId(user.id);

    const advertiser = await prisma.advertiserProfile.findUnique({
      where: { id: advertiserId },
      select: {
        displayName: true,
        businessNumber: true,
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          }
        }
      }
    });

    if (!advertiser) {
      return NextResponse.json(
        { error: '광고주 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      name: advertiser.user.name || advertiser.displayName || '이름 없음',
      email: advertiser.user.email || '이메일 없음',
      phone: advertiser.user.phone || '연락처 없음',
      businessNumber: advertiser.businessNumber || '사업자등록번호 없음',
    });
  } catch (error) {
    console.error('광고주 정보 조회 오류:', error);
    return NextResponse.json(
      { error: '광고주 정보를 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}
