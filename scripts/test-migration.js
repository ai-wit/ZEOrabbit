#!/usr/bin/env node

/**
 * 마이그레이션 테스트 스크립트
 */

const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 데이터베이스 연결 테스트...');

    // Test basic user query
    const users = await prisma.user.findMany({
      select: {
        id: true,
        role: true,
        memberType: true,
        adminType: true,
        email: true
      },
      take: 5
    });

    console.log('✅ 사용자 조회 성공:');
    users.forEach(user => {
      console.log(`  - ${user.email}: ${user.role} (${user.memberType || 'N/A'}, ${user.adminType || 'N/A'})`);
    });

    // Test member profile query
    const memberProfiles = await prisma.memberProfile.findMany({
      select: {
        id: true,
        userId: true,
        level: true
      },
      take: 3
    });

    console.log('\n✅ MemberProfile 조회 성공:');
    memberProfiles.forEach(profile => {
      console.log(`  - ${profile.userId}: 레벨 ${profile.level}`);
    });

    console.log('\n🎉 마이그레이션 테스트 성공!');

  } catch (error) {
    console.error('❌ 테스트 실패:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
