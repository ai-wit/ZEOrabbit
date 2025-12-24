-- ZEOrabbit 사용자 역할 체계 리팩토링 모니터링 쿼리들
-- 배포 후 데이터 상태 모니터링용

-- 1. 역할 분포 모니터링
SELECT
  role,
  COUNT(*) as user_count,
  COUNT(memberType) as with_member_type,
  COUNT(adminType) as with_admin_type
FROM user
GROUP BY role
ORDER BY user_count DESC;

-- 2. 새로운 타입 분포 상세 모니터링
SELECT
  'MEMBER' as role_type,
  memberType as type_value,
  COUNT(*) as count
FROM user
WHERE role = 'MEMBER' AND memberType IS NOT NULL
GROUP BY memberType

UNION ALL

SELECT
  'ADMIN' as role_type,
  adminType as type_value,
  COUNT(*) as count
FROM user
WHERE role = 'ADMIN' AND adminType IS NOT NULL
GROUP BY adminType

ORDER BY role_type, type_value;

-- 3. 프로필 존재 여부 검증
SELECT
  u.role,
  COUNT(*) as total_users,
  COUNT(mp.id) as with_profile,
  ROUND(COUNT(mp.id) / COUNT(*) * 100, 2) as profile_coverage_pct
FROM user u
LEFT JOIN member_profile mp ON u.id = mp.userId
WHERE u.role IN ('MEMBER', 'ADMIN')
GROUP BY u.role;

-- 4. 데이터 마이그레이션 성공률
SELECT
  'Migration Success Rate' as metric,
  COUNT(*) as total_users,
  SUM(CASE WHEN role = 'MEMBER' THEN 1 ELSE 0 END) as migrated_to_member,
  ROUND(SUM(CASE WHEN role = 'MEMBER' THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as migration_success_pct
FROM user
WHERE role IN ('MEMBER', 'ADVERTISER', 'ADMIN');

-- 5. 잠재적 문제 사용자 식별
SELECT
  'Potential Issues' as category,
  COUNT(*) as count
FROM (
  -- MEMBER 역할인데 memberType이 없는 사용자
  SELECT id FROM user WHERE role = 'MEMBER' AND memberType IS NULL
  UNION ALL
  -- ADMIN 역할인데 adminType이 없는 사용자
  SELECT id FROM user WHERE role = 'ADMIN' AND adminType IS NULL
  UNION ALL
  -- MEMBER 역할인데 memberProfile이 없는 사용자
  SELECT u.id FROM user u
  LEFT JOIN member_profile mp ON u.id = mp.userId
  WHERE u.role = 'MEMBER' AND mp.id IS NULL
) issues;

-- 6. 최근 활동 모니터링 (배포 후 24시간)
SELECT
  DATE_FORMAT(createdAt, '%Y-%m-%d %H:00:00') as hour,
  action,
  COUNT(*) as count
FROM audit_log
WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
  AND action IN ('USER_SIGNUP', 'USER_LOGIN', 'MISSION_CLAIMED', 'PAYOUT_REQUESTED')
GROUP BY hour, action
ORDER BY hour DESC, action;

-- 7. 시스템 성능 모니터링
SELECT
  'System Health' as category,
  COUNT(*) as total_logs,
  SUM(CASE WHEN action LIKE '%ERROR%' THEN 1 ELSE 0 END) as error_count,
  ROUND(SUM(CASE WHEN action LIKE '%ERROR%' THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as error_rate_pct
FROM audit_log
WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 1 HOUR);

-- 8. 사용자 참여도 변화 모니터링 (배포 전후 비교)
SELECT
  CASE
    WHEN createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 'Last 24h (Post-deployment)'
    WHEN createdAt >= DATE_SUB(NOW(), INTERVAL 48 HOUR) AND createdAt < DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 'Previous 24h (Pre-deployment)'
    ELSE 'Earlier'
  END as period,
  COUNT(*) as participation_count
FROM participation
WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 48 HOUR)
GROUP BY
  CASE
    WHEN createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 'Last 24h (Post-deployment)'
    WHEN createdAt >= DATE_SUB(NOW(), INTERVAL 48 HOUR) AND createdAt < DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 'Previous 24h (Pre-deployment)'
    ELSE 'Earlier'
  END
ORDER BY participation_count DESC;
