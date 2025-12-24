#!/usr/bin/env node

/**
 * 마이그레이션 검증 스크립트
 *
 * 이 스크립트는 사용자 역할 체계 리팩토링의 마이그레이션 SQL을 검증합니다.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 마이그레이션 SQL 검증 시작...\n');

// 1. 마이그레이션 SQL 파일 검증
const migrationPath = path.join(__dirname, 'migrate-user-roles.sql');
if (!fs.existsSync(migrationPath)) {
  console.error('❌ 마이그레이션 파일이 존재하지 않습니다:', migrationPath);
  process.exit(1);
}

const migrationSql = fs.readFileSync(migrationPath, 'utf8');
console.log('✅ 마이그레이션 파일 로드 성공');

// 2. 필수 SQL 명령어 검증
const requiredCommands = [
  'ALTER TABLE user ADD COLUMN memberType',
  'ALTER TABLE user ADD COLUMN adminType',
  'UPDATE user SET role = \'MEMBER\' WHERE role = \'REWARDER\'',
  'UPDATE user SET memberType = \'NORMAL\' WHERE role = \'MEMBER\'',
  'UPDATE user SET adminType = \'SUPER\' WHERE role = \'ADMIN\'',
  'ALTER TABLE rewarder_profile RENAME TO member_profile'
];

console.log('🔎 SQL 명령어 검증:');
let allCommandsFound = true;

requiredCommands.forEach(command => {
  const found = migrationSql.includes(command.replace(/'/g, "''")); // SQL escaping 고려
  console.log(`  ${found ? '✅' : '❌'} ${command}`);
  if (!found) allCommandsFound = false;
});

if (!allCommandsFound) {
  console.error('\n❌ 일부 필수 SQL 명령어가 누락되었습니다.');
  process.exit(1);
}

// 3. DDL 파일과의 일관성 검증
const ddlPath = path.join(__dirname, '..', 'docs', 'ddl.sql');
if (!fs.existsSync(ddlPath)) {
  console.error('❌ DDL 파일이 존재하지 않습니다:', ddlPath);
  process.exit(1);
}

const ddlSql = fs.readFileSync(ddlPath, 'utf8');
console.log('\n🔎 DDL 파일과의 일관성 검증:');

const ddlChecks = [
  { name: 'UserRole ENUM에 MEMBER 포함', check: ddlSql.includes("ENUM('ADVERTISER','MEMBER','ADMIN')") },
  { name: 'memberType 컬럼 존재', check: ddlSql.includes('memberType ENUM(') },
  { name: 'adminType 컬럼 존재', check: ddlSql.includes('adminType ENUM(') },
  { name: 'member_profile 테이블 존재', check: ddlSql.includes('CREATE TABLE IF NOT EXISTS member_profile') },
  { name: '외래 키 제약조건 업데이트', check: ddlSql.includes('REFERENCES member_profile(id)') }
];

ddlChecks.forEach(({ name, check }) => {
  console.log(`  ${check ? '✅' : '❌'} ${name}`);
  if (!check) allCommandsFound = false;
});

// 4. Prisma 스키마와의 일관성 검증
const prismaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
if (!fs.existsSync(prismaPath)) {
  console.error('❌ Prisma 스키마 파일이 존재하지 않습니다:', prismaPath);
  process.exit(1);
}

const prismaSchema = fs.readFileSync(prismaPath, 'utf8');
console.log('\n🔎 Prisma 스키마와의 일관성 검증:');

const prismaChecks = [
  { name: 'UserRole enum에 MEMBER 포함', check: prismaSchema.includes('MEMBER') },
  { name: 'MemberProfile 모델 존재', check: prismaSchema.includes('model MemberProfile') },
  { name: 'MemberType enum 존재', check: prismaSchema.includes('enum MemberType') },
  { name: 'AdminType enum 존재', check: prismaSchema.includes('enum AdminType') },
  { name: 'User 모델에 memberType 필드', check: prismaSchema.includes('memberType MemberType?') },
  { name: 'User 모델에 adminType 필드', check: prismaSchema.includes('adminType  AdminType?') }
];

prismaChecks.forEach(({ name, check }) => {
  console.log(`  ${check ? '✅' : '❌'} ${name}`);
  if (!check) allCommandsFound = false;
});

if (allCommandsFound) {
  console.log('\n🎉 모든 마이그레이션 검증이 통과되었습니다!');
  console.log('📋 마이그레이션 실행 준비 완료:');
  console.log('   1. 데이터베이스 백업 수행');
  console.log('   2. 마이그레이션 SQL 실행: scripts/migrate-user-roles.sql');
  console.log('   3. Prisma 클라이언트 재생성: npx prisma generate');
  console.log('   4. 애플리케이션 재시작');
} else {
  console.error('\n❌ 마이그레이션 검증 실패');
  console.log('🔧 누락된 변경사항들을 수정한 후 다시 실행해주세요.');
  process.exit(1);
}
