const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkExperienceCampaigns() {
  try {
    console.log('=== 체험단 공고 조회 ===');

    // 모든 체험단 공고 조회
    const allCampaigns = await prisma.experienceCampaign.findMany({
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

    console.log('전체 체험단 공고:', allCampaigns.length, '개');
    allCampaigns.forEach((campaign, index) => {
      console.log(`${index + 1}. ${campaign.title}`);
      console.log(`   ID: ${campaign.id}`);
      console.log(`   상태: ${campaign.status}`);
      console.log(`   신청 마감: ${campaign.applicationDeadline}`);
      console.log(`   현재 시간: ${new Date()}`);
      console.log(`   마감 여부: ${new Date() > campaign.applicationDeadline ? '만료됨' : '유효함'}`);
      console.log(`   광고주: ${campaign.advertiser.user.name}`);
      console.log(`   장소: ${campaign.place.name}`);
      console.log(`   팀 수: ${campaign._count.teams}`);
      console.log('---');
    });

    // API 조건과 동일한 조회 (활성화된 공고, 신청 기간 내)
    const now = new Date();
    const activeCampaigns = await prisma.experienceCampaign.findMany({
      where: {
        status: "ACTIVE",
        applicationDeadline: { gte: now }
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

    console.log('API에서 조회되는 체험단 공고:', activeCampaigns.length, '개');

  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkExperienceCampaigns();
