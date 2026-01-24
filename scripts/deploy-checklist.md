# ZEOrabbit 사용자 역할 체계 리팩토링 배포 체크리스트

## 🎯 배포 개요
- **변경사항**: REWARDER → MEMBER 역할 변경, 새로운 타입 필드 추가
- **영향 범위**: 사용자 인증, 권한 체크, 데이터베이스 스키마
- **배포 전략**: 블루-그린 배포 (권장) 또는 점진적 롤아웃

## 📋 사전 준비사항

### 1. 코드 검증 ✅
- [x] TypeScript 컴파일 오류 없음
- [x] Prisma 스키마 유효성 검증
- [x] 마이그레이션 SQL 검증
- [x] 핵심 API 기능 테스트

### 2. 데이터베이스 준비
- [ ] **프로덕션 DB 백업 완료**
- [ ] 스테이징 환경 DB 준비
- [ ] 마이그레이션 롤백 스크립트 준비

### 3. 테스트 환경 검증
- [ ] 스테이징에 코드 배포
- [ ] 회원가입/로그인 기능 테스트 (MEMBER 역할)
- [ ] 기존 사용자 데이터 마이그레이션 테스트
- [ ] 권한 체크 기능 정상 동작 확인

## 🚀 배포 단계

### Phase 1: 데이터베이스 마이그레이션
```bash
# 1. 프로덕션 DB 백업
mysqldump localmom > backup_pre_migration.sql

# 2. 마이그레이션 실행
mysql localmom < scripts/migrate-user-roles.sql

# 3. 마이그레이션 검증
mysql localmom -e "SELECT role, memberType, adminType, COUNT(*) as count FROM user GROUP BY role, memberType, adminType;"
```

### Phase 2: 애플리케이션 배포
```bash
# 1. Prisma 클라이언트 생성
npx prisma generate

# 2. 애플리케이션 빌드
npm run build

# 3. 블루-그린 배포 또는 롤링 업데이트
# (실제 배포 명령어는 인프라에 따라 다름)
```

### Phase 3: 배포 후 검증
```bash
# 1. 헬스체크
curl -f https://api.localmom.com/health

# 2. 로그인 테스트
# MEMBER 역할로 로그인 가능한지 확인

# 3. 데이터 무결성 검증
# 모든 사용자가 적절한 프로필을 가지고 있는지 확인
```

## 🔍 모니터링 포인트

### 1. 오류 모니터링
- 로그인 실패율 증가
- API 500 오류 발생
- 데이터베이스 연결 오류

### 2. 성능 모니터링
- API 응답시간
- 데이터베이스 쿼리 성능
- 메모리/CPU 사용량

### 3. 비즈니스 메트릭
- 일일 활성 사용자 수
- 회원가입 전환율
- 미션 참여율

## ⚠️ 롤백 계획

### 긴급 롤백 (5분 내)
```bash
# 1. 애플리케이션 롤백 (이전 버전으로)
kubectl rollout undo deployment/localmom-api

# 2. DB 롤백 (필요시)
mysql localmom < backup_pre_migration.sql
```

### 점진적 롤백 (Feature Flag)
```typescript
// 피쳐 플래그로 구버전 동작 유지
const USE_NEW_ROLE_SYSTEM = process.env.USE_NEW_ROLE_SYSTEM === 'true';

if (USE_NEW_ROLE_SYSTEM) {
  // 새로운 역할 체계 사용
  user.role === 'MEMBER'
} else {
  // 구버전 역할 체계 사용
  user.role === 'REWARDER'
}
```

## 📞 커뮤니케이션 계획

### 사전 공지
- [ ] 개발팀: 변경사항 공유
- [ ] 운영팀: 배포 일정 공유
- [ ] 고객서비스: 잠재적 영향 안내

### 배포 중 모니터링
- [ ] 실시간 대시보드 모니터링
- [ ] 15분 간격 상태 보고
- [ ] 이상 감지 시 즉시 알림

### 배포 후
- [ ] 배포 완료 공지
- [ ] 24시간 모니터링 결과 공유
- [ ] 사용자 피드백 수집

## ✅ 배포 승인 체크리스트

- [ ] **PM 승인**: 비즈니스 영향 평가 완료
- [ ] **기술 리더 승인**: 기술적 리스크 평가 완료
- [ ] **QA 승인**: 테스트 완료 및 승인
- [ ] **보안팀 승인**: 보안 영향 평가 완료
- [ ] **운영팀 승인**: 인프라 준비 완료

## 📊 성공 기준

- [ ] 배포 후 1시간 내 오류율 < 1%
- [ ] 사용자 로그인 성공률 > 99%
- [ ] 데이터 마이그레이션 100% 성공
- [ ] 모든 API 엔드포인트 정상 응답
- [ ] 모니터링 대시보드 정상 동작

---

**배포 담당자**: ____________________
**승인자**: ____________________
**배포 일시**: ____________________
