/**
 * 피쳐 플래그 기반 롤백 시스템
 *
 * 배포 후 문제가 발생할 경우 즉시 구버전 동작으로 전환할 수 있는
 * 피쳐 플래그 기반 롤백 메커니즘
 */

import { UserRole } from '@prisma/client';

// 환경 변수로 롤백 제어
const USE_NEW_ROLE_SYSTEM = process.env.USE_NEW_ROLE_SYSTEM !== 'false'; // 기본값: true

/**
 * 역할 기반 리다이렉트 로직 (피쳐 플래그 지원)
 */
export function getDashboardRedirectPath(userRole: UserRole): string {
  if (USE_NEW_ROLE_SYSTEM) {
    // 새로운 역할 체계
    switch (userRole) {
      case 'ADVERTISER':
        return '/advertiser';
      case 'MEMBER':
        return '/member';
      case 'ADMIN':
        return '/admin';
      default:
        return '/';
    }
  } else {
    // 구버전 역할 체계 (롤백용)
    switch (userRole) {
      case 'ADVERTISER':
        return '/advertiser';
      case 'REWARDER':
        return '/rewarder';
      case 'ADMIN':
        return '/admin';
      default:
        return '/';
    }
  }
}

/**
 * 권한 체크 로직 (피쳐 플래그 지원)
 */
export function hasMemberAccess(userRole: UserRole): boolean {
  if (USE_NEW_ROLE_SYSTEM) {
    return userRole === 'MEMBER';
  } else {
    return userRole === 'REWARDER';
  }
}

/**
 * UI 텍스트 렌더링 (피쳐 플래그 지원)
 */
export function getRoleDisplayText(userRole: UserRole): string {
  if (USE_NEW_ROLE_SYSTEM) {
    switch (userRole) {
      case 'ADVERTISER':
        return '광고주';
      case 'MEMBER':
        return '회원';
      case 'ADMIN':
        return '관리자';
      default:
        return '사용자';
    }
  } else {
    switch (userRole) {
      case 'ADVERTISER':
        return '광고주';
      case 'REWARDER':
        return '리워더';
      case 'ADMIN':
        return '관리자';
      default:
        return '사용자';
    }
  }
}

/**
 * 롤백 상태 확인
 */
export function getFeatureFlagStatus(): {
  useNewRoleSystem: boolean;
  status: 'ACTIVE' | 'ROLLBACK_MODE';
  description: string;
} {
  return {
    useNewRoleSystem: USE_NEW_ROLE_SYSTEM,
    status: USE_NEW_ROLE_SYSTEM ? 'ACTIVE' : 'ROLLBACK_MODE',
    description: USE_NEW_ROLE_SYSTEM
      ? '새로운 역할 체계가 활성화되었습니다 (MEMBER, memberType, adminType)'
      : '롤백 모드: 구버전 역할 체계로 동작합니다 (REWARDER)'
  };
}

// 사용 예시:
// 1. 정상 운영: USE_NEW_ROLE_SYSTEM=true (또는 설정하지 않음)
// 2. 긴급 롤백: USE_NEW_ROLE_SYSTEM=false
// 3. 점진적 롤백: 환경 변수로 특정 사용자 그룹만 구버전으로 전환 가능
