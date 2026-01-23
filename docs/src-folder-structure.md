# ZEOrabbit 프로젝트 src 폴더 구조

이 문서는 ZEOrabbit 프로젝트의 `src` 폴더 구조와 각 폴더의 역할을 설명합니다.

## 전체 구조 개요

```
src/
├── app/                    # Next.js App Router 기반 프론트엔드 애플리케이션
├── scripts/               # 데이터베이스 초기화 및 시딩 스크립트
├── server/               # 서버 사이드 비즈니스 로직
└── types/                # TypeScript 타입 정의
```

## 1. app/ - 프론트엔드 애플리케이션

Next.js 13+의 App Router를 사용하는 React 기반 프론트엔드 애플리케이션입니다.

### 1.1 _ui/ - 공통 UI 컴포넌트
- `cn.ts` - Tailwind CSS 클래스 병합 유틸리티
- `DateInput.tsx` - 날짜 입력 컴포넌트
- `ImageLightbox.tsx` - 이미지 라이트박스 컴포넌트
- `loading.tsx` - 로딩 상태 컴포넌트
- `primitives.tsx` - 기본 UI 프리미티브 컴포넌트들
- `shell.tsx` - 앱 셸 레이아웃 컴포넌트

### 1.2 사용자 역할별 페이지들

#### admin/ - 관리자 페이지
- `advertisers/` - 광고주 관리
- `campaigns/` - 캠페인 관리
- `experience-campaigns/` - 체험단 캠페인 관리
- `managers/` - 매니저 관리
- `payouts/` - 정산 관리
- `policies/` - 정책 관리
- `products/` - 상품 관리
- `reviews/` - 리뷰 관리
- `reward/` - 리워드 관리

#### advertiser/ - 광고주 페이지
- `billing/` - 결제 및 청구 관리
- `campaigns/` - 캠페인 관리
- `experience/` - 체험단 관리
- `places/` - 매장 관리
- `products/` - 상품 관리
- `reports/` - 리포트 및 분석
- `reward/` - 리워드 관리

#### member/ - 회원 페이지
- `experience/` - 체험단 참여
- `reward/` - 리워드 관리

### 1.3 api/ - API 라우트 (Next.js API Routes)

#### admin/ - 관리자 API (41개 파일)
- 광고주, 캠페인, 체험단, 매니저, 정산, 정책 등 관리자 기능 관련 API

#### advertiser/ - 광고주 API (16개 파일)
- 캠페인, 체험단, 상품, 결제 등 광고주 기능 관련 API

#### member/ - 회원 API (16개 파일)
- 체험단 참여, 리워드, 팀 관리 등 회원 기능 관련 API

#### rewarder/ - 리워더 API (5개 파일)
- 참여, 정산 등 리워더 기능 관련 API

#### auth/ - 인증 API (5개 파일)
- 로그인, 로그아웃, 회원가입, 이메일 인증 등

#### cron/ - 자동화 작업 API (4개 파일)
- 캠페인 종료, 참여 만료 등 주기적 작업

#### dev/ - 개발용 API (3개 파일)
- 데이터 시딩, 부트스트랩 등 개발 지원

#### payments/ - 결제 API (2개 파일)
- 토스페이먼츠 결제 처리

#### webhooks/ - 웹훅 API (2개 파일)
- 외부 서비스 웹훅 처리

### 1.4 기타 페이지들
- `login/` - 로그인 페이지
- `signup/` - 회원가입 페이지
- `dev/` - 개발용 페이지들
- `test-csr/` - 클라이언트 사이드 렌더링 테스트

## 2. scripts/ - 데이터베이스 관리 스크립트

### 2.1 init-db.ts
프로덕션 환경용 데이터베이스 초기화 스크립트
- 시스템 정책 데이터 초기화
- 슈퍼 관리자 계정 생성
- 체험단 요금제 데이터 설정
- 기본 보안 설정 구성

### 2.2 seed.ts
개발/테스트 환경용 데이터 시딩 스크립트

## 3. server/ - 서버 사이드 비즈니스 로직

서버 사이드 로직을 역할별로 분리하여 관리합니다.

### 3.1 역할별 비즈니스 로직

#### advertiser/ - 광고주 관련
- `advertiser-profile.ts` - 광고주 프로필 관리
- `balance.ts` - 잔액 관리
- `pricing.ts` - 가격 정책

#### member/ - 회원 관련
- `member-profile.ts` - 회원 프로필 관리
- `balance.ts` - 잔액 관리
- `mask.ts` - 데이터 마스킹 (개인정보 보호)
- `policy.ts` - 정책 관리

#### rewarder/ - 리워더 관련
- `rewarder-profile.ts` - 리워더 프로필 관리
- `balance.ts` - 잔액 관리
- `mask.ts` - 데이터 마스킹
- `policy.ts` - 정책 관리

### 3.2 공통 서버 로직

#### auth/ - 인증 관련
- `current-user.ts` - 현재 사용자 정보
- `password.ts` - 비밀번호 해싱/검증
- `require-manager.ts` - 매니저 권한 요구
- `require-user.ts` - 사용자 권한 요구
- `session.ts` - 세션 관리

#### policy/ - 정책 관리
- `get-policy.ts` - 정책 조회
- `types.ts` - 정책 타입 정의

#### security/ - 보안 관련
- `blacklist.ts` - 블랙리스트 관리
- `ip.ts` - IP 주소 관리

#### upload/ - 파일 업로드
- `magic.ts` - 파일 타입 검증
- `storage.ts` - 스토리지 관리

### 3.3 인프라 및 설정
- `prisma.ts` - Prisma 클라이언트 설정
- `env.ts` - 환경 변수 관리
- `toss-payments.ts` - 토스페이먼츠 연동
- `date/date-only.ts` - 날짜 전용 타입
- `verification-store.ts` - 인증 코드 저장소

## 4. types/ - TypeScript 타입 정의

### 4.1 tosspayments.d.ts
토스페이먼츠 결제 SDK의 TypeScript 타입 정의
- Window 인터페이스 확장
- 결제 요청/응답 타입 정의

## 아키텍처 원칙

### 1. 역할 기반 분리
- 사용자 역할(관리자/광고주/회원/리워더)에 따라 폴더와 기능을 명확히 분리
- 각 역할별로 독립적인 API, 페이지, 비즈니스 로직을 유지

### 2. 관심사 분리
- 프론트엔드 (app/)와 백엔드 로직 (server/)을 분리
- UI 컴포넌트 (_ui/)와 페이지 컴포넌트를 분리
- API 라우트와 비즈니스 로직을 분리

### 3. Next.js App Router 활용
- 파일 시스템 기반 라우팅
- 서버 컴포넌트와 클라이언트 컴포넌트의 적절한 사용
- API Routes를 통한 서버리스 함수 구현

### 4. 데이터베이스 중심 설계
- Prisma를 통한 타입 안전한 데이터베이스 접근
- 마이그레이션과 시딩 스크립트를 통한 데이터 관리
- 감사 로그를 통한 데이터 변경 추적

이 구조는 확장성, 유지보수성, 그리고 역할 기반 접근 제어를 고려하여 설계되었습니다.