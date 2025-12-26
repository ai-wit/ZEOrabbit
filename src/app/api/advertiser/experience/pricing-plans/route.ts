import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/server/auth/require-user';
import { z } from 'zod';

const querySchema = z.object({
  placeType: z.enum(['OPENING_SOON', 'OPERATING']),
});

export async function GET(request: NextRequest) {
  try {
    // 일시적으로 인증 생략 (테스트용)
    // await requireRole('ADVERTISER');

    const { searchParams } = new URL(request.url);
    const query = querySchema.safeParse({
      placeType: searchParams.get('placeType'),
    });

    if (!query.success) {
      return NextResponse.json(
        { error: '유효하지 않은 쿼리 파라미터입니다.' },
        { status: 400 }
      );
    }

    const { placeType } = query.data;

    // 하드코딩된 요금제 데이터 (나중에 데이터베이스에서 로드)
    const pricingPlans = getPricingPlansByPlaceType(placeType);

    return NextResponse.json(pricingPlans);
  } catch (error) {
    console.error('요금제 조회 오류:', error);
    return NextResponse.json(
      { error: '요금제를 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}

function getPricingPlansByPlaceType(placeType: 'OPENING_SOON' | 'OPERATING') {
  if (placeType === 'OPENING_SOON') {
    return [
      {
        id: 'opening-basic',
        name: 'Basic',
        displayName: 'Basic 29만원',
        priceKrw: 290000,
        description: '오픈 준비 팩 - 리뷰 0개인 민망한 상태만 피하자. (사진/기본리뷰 확보)',
        teamCount: 1,
        leaderLevel: 'Lv1',
        reviewCount: 25,
        hasRankingBoost: false,
        trafficTarget: 3000,
        saveTarget: 100,
      },
      {
        id: 'opening-pro',
        name: 'Pro',
        displayName: 'Pro 49만원',
        priceKrw: 490000,
        description: '그랜드 오픈 팩 - 오픈 첫 주에 리뷰 50개 깔아서 기선 제압하자.',
        teamCount: 1,
        leaderLevel: 'Lv1',
        reviewCount: 50,
        hasRankingBoost: true,
        trafficTarget: 3000,
        saveTarget: 100,
      },
      {
        id: 'opening-vip',
        name: 'VIP',
        displayName: 'VIP 79만원',
        priceKrw: 790000,
        description: '런칭 컨설팅 팩 - 첫 단추부터 전문가가 끼워준다. SEO/키워드 완벽 세팅.',
        teamCount: 1,
        leaderLevel: 'Lv2',
        reviewCount: 50,
        hasRankingBoost: true,
        trafficTarget: 5000,
        saveTarget: 300,
      },
    ];
  } else {
    return [
      {
        id: 'operating-basic',
        name: 'Basic',
        displayName: '① 29만원 (실속형)',
        priceKrw: 290000,
        description: '자료 수집 & 기본 리뷰',
        teamCount: 1,
        leaderLevel: 'Lv1',
        reviewCount: 25,
        hasRankingBoost: false,
        trafficTarget: 3000,
        saveTarget: 100,
      },
      {
        id: 'operating-tech',
        name: 'Tech',
        displayName: '② 49만원 A (기술형)',
        priceKrw: 490000,
        description: '리뷰 + 순위 부스팅',
        teamCount: 1,
        leaderLevel: 'Lv1',
        reviewCount: 25,
        hasRankingBoost: true,
        trafficTarget: 3000,
        saveTarget: 100,
      },
      {
        id: 'operating-volume',
        name: 'Volume',
        displayName: '③ 49만원 B (물량형)',
        priceKrw: 490000,
        description: '리뷰 폭격 (물량 2배) - 도배 효과',
        teamCount: 2,
        leaderLevel: 'Lv1',
        reviewCount: 50,
        hasRankingBoost: false,
        trafficTarget: 3000,
        saveTarget: 100,
      },
      {
        id: 'operating-vip',
        name: 'VIP',
        displayName: '④ 79만원 (VIP형)',
        priceKrw: 790000,
        description: '지역 1등 만들기 (Total) - 고퀄리티 보장',
        teamCount: 2,
        leaderLevel: 'Lv2',
        reviewCount: 50,
        hasRankingBoost: true,
        trafficTarget: 5000,
        saveTarget: 300,
      },
    ];
  }
}
