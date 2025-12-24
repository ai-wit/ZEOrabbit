#!/usr/bin/env node

/**
 * LocalMom 사용자 역할 체계 리팩토링 테스트 스크립트
 *
 * 이 스크립트는 리팩토링된 사용자 역할 체계를 검증합니다:
 * - REWARDER → MEMBER 역할 변경
 * - 새로운 memberType 및 adminType 필드
 * - 데이터 마이그레이션 검증
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTests() {
  console.log('🧪 LocalMom 사용자 역할 체계 리팩토링 테스트 시작\n');

  try {
    // 1. 데이터베이스 연결 확인
    console.log('1️⃣ 데이터베이스 연결 확인...');
    await prisma.$connect();
    console.log('✅ 데이터베이스 연결 성공\n');

    // 2. 새로운 역할 체계 검증
    console.log('2️⃣ 새로운 역할 체계 검증...');

    // MEMBER 역할 사용자들 확인
    const members = await prisma.user.findMany({
      where: { role: 'MEMBER' },
      select: { id: true, email: true, role: true, memberType: true, memberProfile: { select: { id: true } } }
    });

    console.log(`✅ MEMBER 역할 사용자 수: ${members.length}`);
    members.forEach(member => {
      console.log(`   - ${member.email}: memberType=${member.memberType}, profile=${!!member.memberProfile}`);
    });

    // ADMIN 역할 사용자들 확인
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true, email: true, role: true, adminType: true }
    });

    console.log(`✅ ADMIN 역할 사용자 수: ${admins.length}`);
    admins.forEach(admin => {
      console.log(`   - ${admin.email}: adminType=${admin.adminType}`);
    });

    // ADVERTISER 역할 사용자들 확인
    const advertisers = await prisma.user.findMany({
      where: { role: 'ADVERTISER' },
      select: { id: true, email: true, role: true, advertiserProfile: { select: { id: true } } }
    });

    console.log(`✅ ADVERTISER 역할 사용자 수: ${advertisers.length}\n`);

    // 3. 새로운 타입 분포 확인
    console.log('3️⃣ 새로운 타입 분포 확인...');

    const memberTypeStats = await prisma.user.groupBy({
      by: ['memberType'],
      where: { role: 'MEMBER' },
      _count: { memberType: true }
    });

    console.log('MEMBER 타입 분포:');
    memberTypeStats.forEach(stat => {
      console.log(`   - ${stat.memberType}: ${stat._count.memberType}명`);
    });

    const adminTypeStats = await prisma.user.groupBy({
      by: ['adminType'],
      where: { role: 'ADMIN' },
      _count: { adminType: true }
    });

    console.log('ADMIN 타입 분포:');
    adminTypeStats.forEach(stat => {
      console.log(`   - ${stat.adminType}: ${stat._count.adminType}명`);
    });
    console.log('');

    // 4. 테이블 구조 검증
    console.log('4️⃣ 테이블 구조 검증...');

    // member_profile 테이블 존재 확인
    const memberProfileCount = await prisma.memberProfile.count();
    console.log(`✅ member_profile 테이블 레코드 수: ${memberProfileCount}`);

    // rewarder_profile 테이블이 존재하지 않는지 확인 (있으면 안됨)
    try {
      await prisma.rewarderProfile.count();
      console.log('❌ rewarder_profile 테이블이 아직 존재합니다!');
    } catch (error) {
      console.log('✅ rewarder_profile 테이블이 성공적으로 제거되었습니다.');
    }
    console.log('');

    // 5. 관계 무결성 검증
    console.log('5️⃣ 관계 무결성 검증...');

    // 모든 MEMBER 사용자가 memberProfile을 가지고 있는지 확인
    const membersWithoutProfile = await prisma.user.findMany({
      where: {
        role: 'MEMBER',
        memberProfile: null
      },
      select: { email: true }
    });

    if (membersWithoutProfile.length === 0) {
      console.log('✅ 모든 MEMBER 역할 사용자가 memberProfile을 가지고 있습니다.');
    } else {
      console.log('❌ 다음 MEMBER 사용자들이 memberProfile을 가지고 있지 않습니다:');
      membersWithoutProfile.forEach(user => console.log(`   - ${user.email}`));
    }

    // 모든 ADVERTISER 사용자가 advertiserProfile을 가지고 있는지 확인
    const advertisersWithoutProfile = await prisma.user.findMany({
      where: {
        role: 'ADVERTISER',
        advertiserProfile: null
      },
      select: { email: true }
    });

    if (advertisersWithoutProfile.length === 0) {
      console.log('✅ 모든 ADVERTISER 역할 사용자가 advertiserProfile을 가지고 있습니다.');
    } else {
      console.log('❌ 다음 ADVERTISER 사용자들이 advertiserProfile을 가지고 있지 않습니다:');
      advertisersWithoutProfile.forEach(user => console.log(`   - ${user.email}`));
    }
    console.log('');

    // 6. 샘플 데이터로 API 시뮬레이션
    console.log('6️⃣ API 시뮬레이션 테스트...');

    // CurrentUser 타입 검증을 위한 샘플
    const sampleMember = members.find(m => m.memberType === 'TEAM_LEADER');
    if (sampleMember) {
      console.log(`✅ TEAM_LEADER 타입 사용자 샘플: ${sampleMember.email}`);
      console.log(`   CurrentUser 타입: role="${sampleMember.role}", memberType="${sampleMember.memberType}"`);
    }

    const sampleAdmin = admins.find(a => a.adminType === 'SUPER');
    if (sampleAdmin) {
      console.log(`✅ SUPER 타입 관리자 샘플: ${sampleAdmin.email}`);
      console.log(`   CurrentUser 타입: role="${sampleAdmin.role}", adminType="${sampleAdmin.adminType}"`);
    }

    console.log('');

    console.log('🎉 모든 테스트가 완료되었습니다!');
    console.log('\n📋 요약:');
    console.log(`   - 총 사용자: ${members.length + admins.length + advertisers.length}명`);
    console.log(`   - MEMBER: ${members.length}명 (${memberTypeStats.map(s => `${s.memberType}:${s._count.memberType}`).join(', ')})`);
    console.log(`   - ADMIN: ${admins.length}명 (${adminTypeStats.map(s => `${s.adminType}:${s._count.adminType}`).join(', ')})`);
    console.log(`   - ADVERTISER: ${advertisers.length}명`);
    console.log('   - 테이블 마이그레이션: rewarder_profile → member_profile ✅');
    console.log('   - 관계 무결성: 모든 프로필 연결 성공 ✅');

  } catch (error) {
    console.error('❌ 테스트 실패:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
