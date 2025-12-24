-- LocalMom 사용자 역할 체계 마이그레이션 스크립트
-- REWARDER → MEMBER 역할 변경 및 새로운 타입 필드 추가

-- 1. 새로운 컬럼 추가
ALTER TABLE user ADD COLUMN memberType ENUM('NORMAL','TEAM_LEADER','TEAM_PRO_LEADER') NULL;
ALTER TABLE user ADD COLUMN adminType ENUM('SUPER','MANAGER') NULL;

-- 2. 데이터 마이그레이션
-- REWARDER → MEMBER로 변경
UPDATE user SET role = 'MEMBER' WHERE role = 'REWARDER';

-- MEMBER 역할 사용자에게 기본 memberType 설정
UPDATE user SET memberType = 'NORMAL' WHERE role = 'MEMBER';

-- ADMIN 역할 사용자에게 기본 adminType 설정
UPDATE user SET adminType = 'SUPER' WHERE role = 'ADMIN';

-- 3. 테이블명 변경 (주의: 외래 키 제약조건으로 인해 순서 중요)
-- 외래 키 제약조건을 일시적으로 비활성화
SET FOREIGN_KEY_CHECKS = 0;

-- 테이블명 변경
ALTER TABLE rewarder_profile RENAME TO member_profile;

-- 외래 키 제약조건 재활성화
SET FOREIGN_KEY_CHECKS = 1;

-- 4. 마이그레이션 완료 로그
INSERT INTO audit_log (actorUserId, action, targetType, targetId, payloadJson)
VALUES (
  NULL,
  'SYSTEM_MIGRATION',
  'Migration',
  'user-role-refactoring',
  JSON_OBJECT(
    'description', 'User role system refactored: REWARDER->MEMBER, added memberType/adminType',
    'migratedAt', NOW(),
    'version', '1.0'
  )
);
