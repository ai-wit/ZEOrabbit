import { requireRole } from '@/server/auth/require-user';
import { getAdvertiserProfileIdByUserId } from '@/server/advertiser/advertiser-profile';
import { prisma } from '@/server/prisma';
import { PageShell } from '@/app/_ui/shell';
import { AdvertiserHeader } from '../../_components/AdvertiserHeader';
import NewExperienceApplicationClient from './client';

export default async function NewExperienceApplicationPage() {
  // 광고주 권한 확인 및 정보 로드
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
    throw new Error('광고주 정보를 찾을 수 없습니다.');
  }

  const advertiserInfo = {
    name: advertiser.user.name || advertiser.displayName || '이름 없음',
    email: advertiser.user.email || '이메일 없음',
    phone: advertiser.user.phone || '연락처 없음',
    businessNumber: advertiser.businessNumber || '사업자등록번호 없음',
  };

  return (
    <PageShell
      header={
        <AdvertiserHeader
          title="새 체험단 신청"
          description="체험단 서비스를 신청하고 매장을 홍보해보세요."
        />
      }
    >
      <NewExperienceApplicationClient advertiserInfo={advertiserInfo} />
    </PageShell>
  );
}