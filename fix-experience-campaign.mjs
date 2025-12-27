import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixExperienceCampaign() {
  try {
    console.log('=== 체험단 공고 상태 변경 ===');

    // DRAFT 상태의 체험단 공고를 ACTIVE로 변경
    const result = await prisma.experienceCampaign.updateMany({
      where: {
        status: "DRAFT"
      },
      data: {
        status: "ACTIVE"
      }
    });

    console.log(`변경된 공고 수: ${result.count}개`);

    // 변경 후 확인
    const activeCampaigns = await prisma.experienceCampaign.findMany({
      where: {
        status: "ACTIVE",
        applicationDeadline: { gte: new Date() }
      },
      include: {
        advertiser: { include: { user: { select: { name: true } } } },
        place: { select: { name: true, externalProvider: true } },
        _count: {
          select: {
            teams: true
          }
        }
      }
    });

    console.log('활성화된 체험단 공고:', activeCampaigns.length, '개');
    activeCampaigns.forEach((campaign, index) => {
      console.log(`${index + 1}. ${campaign.title} (${campaign.status})`);
    });

  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixExperienceCampaign();
