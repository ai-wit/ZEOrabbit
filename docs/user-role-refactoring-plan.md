# ZEOrabbit 사용자 역할 체계 리팩토링 계획서

## 개요

현재 시스템의 사용자 역할 체계를 다음과 같이 리팩토링합니다:

1. **REWARDER → MEMBER**: 역할명을 변경하고 세분화
2. **ADMIN 세분화**: 관리자 역할 세분화
3. **테이블명 변경**: rewarder_profile → member_profile

## 목표 역할 체계

### UserRole (최상위 역할)
- `ADVERTISER`: 광고주 (변경 없음)
- `MEMBER`: 일반 회원 (기존 REWARDER)
- `ADMIN`: 관리자

### MemberType (MEMBER 역할 세분화)
- `NORMAL`: 일반 회원
- `TEAM_LEADER`: 팀 리더
- `TEAM_PRO_LEADER`: 프로 팀 리더

### AdminType (ADMIN 역할 세분화)
- `SUPER`: 슈퍼 관리자 (모든 권한)
- `MANAGER`: 매니저 (제한된 관리 권한)

## 현재 시스템 분석

### 데이터베이스 구조
- `user` 테이블: `role` ENUM('ADVERTISER','REWARDER','ADMIN')
- `rewarder_profile` 테이블: 리워더 전용 프로필 정보

### 주요 영향 범위
- **24개 파일**에서 REWARDER 직접 참조
- **권한 체크 로직**: `requireRole("REWARDER")`
- **라우팅 로직**: 로그인 후 리다이렉트
- **UI 텍스트**: "REWARDER" 표시
- **시드 데이터**: 초기 데이터 생성

---

## 변경사항 상세

### 1. 데이터베이스 스키마 변경

#### 1.1 UserRole ENUM 변경
**변경 전:**
```sql
role ENUM('ADVERTISER','REWARDER','ADMIN') NOT NULL
```

**변경 후:**
```sql
role ENUM('ADVERTISER','MEMBER','ADMIN') NOT NULL
```

#### 1.2 새로운 타입 필드 추가
```sql
-- MEMBER 역할 세분화
memberType ENUM('NORMAL','TEAM_LEADER','TEAM_PRO_LEADER') NULL

-- ADMIN 역할 세분화
adminType ENUM('SUPER','MANAGER') NULL
```

#### 1.3 테이블명 변경
```sql
-- rewarder_profile → member_profile
ALTER TABLE rewarder_profile RENAME TO member_profile;
```

### 2. Prisma Schema 변경

#### 2.1 UserRole enum 업데이트
```prisma
enum UserRole {
  ADVERTISER
  MEMBER      // REWARDER → MEMBER
  ADMIN
}
```

#### 2.2 새로운 타입 enum 추가
```prisma
enum MemberType {
  NORMAL
  TEAM_LEADER
  TEAM_PRO_LEADER
}

enum AdminType {
  SUPER
  MANAGER
}
```

#### 2.3 User 모델 업데이트
```prisma
model User {
  // ... 기존 필드들
  role      UserRole

  // 새로운 필드들
  memberType MemberType?
  adminType  AdminType?

  // 테이블명 변경
  memberProfile   MemberProfile?  // rewarderProfile → memberProfile
  // ... 나머지 필드들
}
```

#### 2.4 MemberProfile 모델 (기존 RewarderProfile)
```prisma
model MemberProfile {  // RewarderProfile → MemberProfile
  // ... 기존 필드들 (userId, level, trustScore, warningCount, createdAt, updatedAt)

  user          User           @relation(fields: [userId], references: [id], onDelete: Restrict)
  participations Participation[]
  creditLedgers  CreditLedger[]
  payoutAccounts PayoutAccount[]
  payoutRequests PayoutRequest[]
  fraudSignals   FraudSignal[]
}
```

### 3. 타입 시스템 변경

#### 3.1 CurrentUser 타입 업데이트
```typescript
// src/server/auth/current-user.ts
export type CurrentUser = {
  id: string;
  role: "ADVERTISER" | "MEMBER" | "ADMIN";  // REWARDER → MEMBER
  email: string | null;
  memberType?: "NORMAL" | "TEAM_LEADER" | "TEAM_PRO_LEADER";
  adminType?: "SUPER" | "MANAGER";
};
```

#### 3.2 API 스키마 업데이트
```typescript
// src/app/api/auth/signup/route.ts
role: z.enum(["ADVERTISER", "MEMBER"]),  // REWARDER → MEMBER

// src/app/api/dev/bootstrap/route.ts
role: "ADVERTISER" | "MEMBER" | "ADMIN";  // REWARDER → MEMBER
```

### 4. 비즈니스 로직 변경

#### 4.1 권한 체크 로직
```typescript
// src/server/auth/require-user.ts
export async function requireRole(
  role: CurrentUser["role"]
): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== role) redirect("/");
  return user;
}

// requireMemberRole 헬퍼 함수 추가 (선택사항)
export async function requireMemberRole(): Promise<CurrentUser & { role: "MEMBER" }> {
  const user = await requireRole("MEMBER");
  return user;
}
```

#### 4.2 라우팅 로직
```typescript
// src/app/page.tsx, src/app/api/auth/login/route.ts 등
const redirectTo = user.role === "ADVERTISER"
  ? "/advertiser"
  : user.role === "MEMBER"  // REWARDER → MEMBER
    ? "/member"             // /rewarder → /member (선택사항)
    : "/admin";
```

#### 4.3 프로필 생성 로직
```typescript
// 시드 데이터 생성 시
if (user.role === "MEMBER") {  // REWARDER → MEMBER
  await tx.memberProfile.create({ data: { userId: user.id } });  // rewarderProfile → memberProfile
  // 약관 동의 로직
}
```

### 5. 파일/디렉토리 구조 변경

#### 5.1 디렉토리명 변경 (선택사항)
```
/src/app/rewarder/ → /src/app/member/
/src/app/api/rewarder/ → /src/app/api/member/
```

#### 5.2 파일명 변경
- `src/server/rewarder/ → src/server/member/`
- `src/server/rewarder/rewarder-profile.ts → src/server/member/member-profile.ts`

### 6. UI/UX 변경

#### 6.1 텍스트 변경
- "REWARDER" → "MEMBER"
- "리워더" → "회원" 또는 "멤버"

#### 6.2 라우팅 경로 변경
- `/rewarder` → `/member` (또는 유지)

---

## 마이그레이션 전략

### 단계별 실행 계획

#### Phase 1: 준비 및 분석 (1-2일)
1. **영향도 분석**: 모든 REWARDER 참조 파일 식별
2. **테스트 케이스 작성**: 변경 전후 동작 검증
3. **백업 계획 수립**: 롤백 방안 준비

#### Phase 2: 데이터베이스 변경 (1일)
1. **새 스키마 적용**: DDL 및 Prisma 업데이트
2. **마이그레이션 스크립트 작성**:
   ```sql
   -- 1. 새로운 컬럼 추가
   ALTER TABLE user ADD COLUMN memberType ENUM('NORMAL','TEAM_LEADER','TEAM_PRO_LEADER') NULL;
   ALTER TABLE user ADD COLUMN adminType ENUM('SUPER','MANAGER') NULL;

   -- 2. 데이터 마이그레이션
   UPDATE user SET role = 'MEMBER' WHERE role = 'REWARDER';
   UPDATE user SET memberType = 'NORMAL' WHERE role = 'MEMBER';
   UPDATE user SET adminType = 'SUPER' WHERE role = 'ADMIN';

   -- 3. 테이블명 변경
   ALTER TABLE rewarder_profile RENAME TO member_profile;

   -- 4. 기존 컬럼 제거 (필요시)
   -- ALTER TABLE user DROP COLUMN role_old;
   ```

#### Phase 3: 코드 변경 (2-3일)
1. **Prisma 스키마 업데이트**
2. **타입 정의 변경**
3. **비즈니스 로직 변경**
4. **API 핸들러 업데이트**
5. **UI 컴포넌트 변경**

#### Phase 4: 테스트 및 검증 (1-2일)
1. **단위 테스트**: 모든 변경사항 커버
2. **통합 테스트**: 사용자 플로우 검증
3. **E2E 테스트**: 실제 사용자 시나리오

#### Phase 5: 배포 및 모니터링 (1일)
1. **스테이징 배포**: 테스트 환경 검증
2. **프로덕션 배포**: 점진적 롤아웃
3. **모니터링**: 오류 및 성능 모니터링

### 롤백 계획
1. **즉시 롤백**: 코드 롤백 + DB 스냅샷 복원
2. **점진적 롤백**: 피쳐 플래그로 구버전 활성화
3. **데이터 복구**: 백업에서 REWARDER 데이터 복원

---

## 위험 요소 및 완화 방안

### 1. 데이터 손실 위험
- **위험**: 마이그레이션 중 데이터 유실
- **완화**: 전체 DB 백업, 단계별 마이그레이션, 트랜잭션 사용

### 2. 서비스 중단 위험
- **위험**: 배포 중 서비스 다운타임
- **완화**: 블루-그린 배포, 점진적 롤아웃

### 3. 권한 체크 실패
- **위험**: 잘못된 권한 체크로 인한 보안 문제
- **완화**: 철저한 테스트, 권한 매트릭스 검증

### 4. 외부 시스템 영향
- **위험**: API 응답 형식 변경으로 인한 외부 영향
- **완화**: API 버저닝, 외부 시스템 영향도 분석

---

## 검증 체크리스트

### 기능 검증
- [ ] 회원가입: MEMBER 역할로 가입 가능
- [ ] 로그인: 올바른 리다이렉트
- [ ] 권한 체크: MEMBER 전용 페이지 접근
- [ ] 프로필: MemberProfile 정상 동작
- [ ] 미션 참여: 기존 기능 유지
- [ ] 정산: 기존 기능 유지

### 데이터 검증
- [ ] 기존 REWARDER → MEMBER 마이그레이션
- [ ] MemberProfile 테이블 정상 동작
- [ ] 모든 외래키 관계 유지

### 성능 검증
- [ ] 쿼리 성능 저하 없음
- [ ] API 응답시간 정상
- [ ] DB 부하 정상

---

## 예상 작업량

- **총 기간**: 1주 (5-7일)
- **개발자**: 1-2명
- **주요 작업**:
  - DB 마이그레이션: 1일
  - 코드 변경: 3일
  - 테스트: 2일
  - 배포 및 모니터링: 1일

## 승인 및 검토

- **PM/PO 승인**: [ ]
- **기술 리더 승인**: [ ]
- **QA 승인**: [ ]

---

## 작업 관리 TODO 리스트

### Phase 1: 준비 및 분석 (1-2일)
- [ ] **영향도 분석 완료** - 모든 REWARDER 참조 파일 식별 및 분류
- [ ] **테스트 케이스 작성** - 변경 전후 동작 검증 테스트 케이스 작성
- [ ] **백업 계획 수립** - DB 백업 및 롤백 방안 준비
- [ ] **팀 리뷰 및 승인** - PM/기술리더와 변경사항 검토

### Phase 2: 데이터베이스 변경 (1일)
- [ ] **DDL 파일 업데이트** - docs/ddl.sql의 UserRole ENUM 변경
- [ ] **Prisma 스키마 업데이트** - schema.prisma의 enum 및 모델 변경
- [ ] **마이그레이션 스크립트 작성** - 데이터 마이그레이션 SQL 스크립트
- [ ] **테스트 환경 적용** - 스테이징 DB에 변경사항 적용 및 검증

### Phase 3: 코드 변경 (2-3일)
- [ ] **타입 시스템 업데이트** - CurrentUser 및 API 타입 변경
- [ ] **권한 체크 로직 변경** - requireRole 및 관련 함수들 업데이트
- [ ] **라우팅 로직 수정** - 로그인/리다이렉트 로직 변경
- [ ] **API 핸들러 업데이트** - 모든 rewarder 관련 API 경로 변경
- [ ] **UI 컴포넌트 변경** - 텍스트 및 라벨 변경
- [ ] **시드 데이터 수정** - 초기 데이터 생성 로직 업데이트
- [ ] **디렉토리 구조 변경** - rewarder → member 폴더명 변경 (선택)

### Phase 4: 테스트 및 검증 (1-2일)
- [ ] **단위 테스트 작성** - 모든 변경사항에 대한 단위 테스트
- [ ] **통합 테스트 실행** - 사용자 플로우 종단간 테스트
- [ ] **데이터 마이그레이션 검증** - 기존 데이터 정확성 확인
- [ ] **성능 테스트** - API 응답시간 및 DB 쿼리 성능 검증
- [ ] **보안 테스트** - 권한 체크 및 접근 제어 검증

### Phase 5: 배포 및 모니터링 (1일)
- [ ] **스테이징 배포** - 테스트 환경에 완전 배포 및 검증
- [ ] **프로덕션 배포** - 점진적 롤아웃 (블루-그린 배포 권장)
- [ ] **모니터링 설정** - 오류 로그 및 성능 메트릭 모니터링
- [ ] **롤백 준비** - 문제가 발생 시 즉시 롤백할 수 있는 방안 준비

### 추가 작업 (필요시)
- [ ] **문서 업데이트** - API 문서 및 사용자 가이드 업데이트
- [ ] **외부 시스템 영향 검토** - 타 시스템에 미치는 영향 분석
- [ ] **사용자 커뮤니케이션** - 사용자들에게 변경사항 안내
- [ ] **교육 자료 준비** - 개발팀을 위한 변경사항 설명 자료

### 작업 우선순위
- 🔴 **P0 (Critical)**: 데이터베이스 변경, 권한 체크 로직, 기본 라우팅
- 🟡 **P1 (Important)**: UI 텍스트 변경, 시드 데이터, API 업데이트
- 🟢 **P2 (Nice to have)**: 디렉토리 구조 변경, 문서 업데이트, 성능 최적화

### 작업자 할당
- **DB/인프라**: ____________________
- **백엔드 API**: ____________________
- **프론트엔드**: ____________________
- **테스트/QA**: ____________________
- **PM/기획**: ____________________

### 진행 상황 추적
- **총 작업 항목**: 28개
- **완료된 항목**: 0개 (0%)
- **진행 중**: 0개
- **남은 기간**: 7일
- **위험 요소**: 없음

---

*문서 버전: 1.0*
*작성일: 2025-12-24*
*다음 검토일: 2025-12-31*
