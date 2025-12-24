#!/usr/bin/env node

/**
 * 사용자 역할 마이그레이션 실행 스크립트
 *
 * 이 스크립트는 Prisma를 사용하여 데이터베이스 마이그레이션을 실행합니다.
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🚀 사용자 역할 마이그레이션 시작...\n');

  const prisma = new PrismaClient();

  try {
    // 트랜잭션으로 마이그레이션 실행
    await prisma.$transaction(async (tx) => {
      console.log('📝 새로운 컬럼 추가 중...');

      // 1. 새로운 컬럼 추가 (이미 존재하는 경우 무시)
      try {
        await tx.$executeRaw`ALTER TABLE user ADD COLUMN memberType ENUM('NORMAL','TEAM_LEADER','TEAM_PRO_LEADER') NULL`;
        console.log('✅ memberType 컬럼 추가됨');
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log('⚠️  memberType 컬럼이 이미 존재합니다');
        } else {
          throw error;
        }
      }

      try {
        await tx.$executeRaw`ALTER TABLE user ADD COLUMN adminType ENUM('SUPER','MANAGER') NULL`;
        console.log('✅ adminType 컬럼 추가됨');
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log('⚠️  adminType 컬럼이 이미 존재합니다');
        } else {
          throw error;
        }
      }

      console.log('🔄 데이터 마이그레이션 중...');

      // 2. 데이터 마이그레이션
      const rewarderUpdateResult = await tx.$executeRaw`UPDATE user SET role = 'MEMBER' WHERE role = 'REWARDER'`;
      console.log(`✅ REWARDER → MEMBER: ${rewarderUpdateResult}개 행 업데이트됨`);

      const memberTypeUpdateResult = await tx.$executeRaw`UPDATE user SET memberType = 'NORMAL' WHERE role = 'MEMBER' AND memberType IS NULL`;
      console.log(`✅ MEMBER 기본 memberType 설정: ${memberTypeUpdateResult}개 행 업데이트됨`);

      const adminTypeUpdateResult = await tx.$executeRaw`UPDATE user SET adminType = 'SUPER' WHERE role = 'ADMIN' AND adminType IS NULL`;
      console.log(`✅ ADMIN 기본 adminType 설정: ${adminTypeUpdateResult}개 행 업데이트됨`);

      console.log('🏗️ 테이블명 변경 중...');

      // 3. 테이블명 변경 (외래 키 제약조건 고려)
      try {
        await tx.$executeRaw`SET FOREIGN_KEY_CHECKS = 0`;
        await tx.$executeRaw`ALTER TABLE rewarder_profile RENAME TO member_profile`;
        await tx.$executeRaw`SET FOREIGN_KEY_CHECKS = 1`;
        console.log('✅ rewarder_profile → member_profile 테이블명 변경됨');
      } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE') {
          console.log('⚠️  rewarder_profile 테이블이 존재하지 않습니다');
        } else if (error.code === 'ER_TABLE_EXISTS_ERROR') {
          console.log('⚠️  member_profile 테이블이 이미 존재합니다');
        } else {
          throw error;
        }
      }

      // 4. 마이그레이션 완료 로그
      await tx.auditLog.create({
        data: {
          actorUserId: null,
          action: 'SYSTEM_MIGRATION',
          targetType: 'Migration',
          targetId: 'user-role-refactoring',
          payloadJson: {
            description: 'User role system refactored: REWARDER->MEMBER, added memberType/adminType',
            migratedAt: new Date(),
            version: '1.0'
          }
        }
      });

      console.log('✅ 마이그레이션 완료 로그 기록됨');
    });

    console.log('\n🎉 마이그레이션이 성공적으로 완료되었습니다!');
    console.log('📋 다음 단계:');
    console.log('   1. Prisma 클라이언트 재생성: npx prisma generate');
    console.log('   2. 애플리케이션 재시작');

  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
