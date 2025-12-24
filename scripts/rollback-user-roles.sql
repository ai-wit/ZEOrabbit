-- ZEOrabbit 사용자 역할 체계 리팩토링 롤백 스크립트
-- MEMBER → REWARDER 역할 변경 롤백 및 타입 필드 제거

-- 긴급 롤백 시나리오에서만 사용
-- 주의: 이 스크립트는 데이터를 영구적으로 변경하므로 신중하게 사용

SET FOREIGN_KEY_CHECKS = 0;

-- 1. 테이블명 롤백 (member_profile → rewarder_profile)
ALTER TABLE member_profile RENAME TO rewarder_profile;

-- 2. 역할 데이터 롤백 (MEMBER → REWARDER)
UPDATE user SET role = 'REWARDER' WHERE role = 'MEMBER';

-- 3. 새로운 컬럼 제거 (주의: 데이터 손실 발생)
ALTER TABLE user DROP COLUMN memberType;
ALTER TABLE user DROP COLUMN adminType;

-- 4. 외래 키 제약조건 재활성화
SET FOREIGN_KEY_CHECKS = 1;

-- 5. 롤백 완료 로그
INSERT INTO audit_log (actorUserId, action, targetType, targetId, payloadJson)
VALUES (
  NULL,
  'SYSTEM_ROLLBACK',
  'Rollback',
  'user-role-refactoring',
  JSON_OBJECT(
    'description', 'User role system rolled back: MEMBER->REWARDER, removed memberType/adminType',
    'rolledBackAt', NOW(),
    'version', '1.0'
  )
);

-- 6. 롤백 검증 쿼리
SELECT
  'Rollback Verification' as status,
  COUNT(*) as total_users,
  SUM(CASE WHEN role = 'REWARDER' THEN 1 ELSE 0 END) as rewarder_count,
  SUM(CASE WHEN role = 'MEMBER' THEN 1 ELSE 0 END) as member_count,
  SUM(CASE WHEN memberType IS NOT NULL THEN 1 ELSE 0 END) as remaining_member_types,
  SUM(CASE WHEN adminType IS NOT NULL THEN 1 ELSE 0 END) as remaining_admin_types
FROM user;
