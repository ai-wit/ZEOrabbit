# ZEOrabbit 프론트엔드 페이지 구조

이 문서는 ZEOrabbit 프로젝트의 프론트엔드 페이지(화면) URI 구조와 각 페이지의 역할을 정리합니다.

Next.js App Router를 기반으로 `src/app/` 폴더 구조가 URL 경로를 결정합니다.

## 전체 구조 개요

```
app/
├── page.tsx                          # 메인 랜딩 페이지 (/)
├── login/page.tsx                    # 로그인 페이지 (/login)
├── signup/page.tsx                   # 회원가입 페이지 (/signup)
├── admin/                            # 관리자 페이지들 (/admin/*)
├── advertiser/                       # 광고주 페이지들 (/advertiser/*)
├── member/                           # 회원 페이지들 (/member/*)
├── dev/                              # 개발용 페이지들 (/dev/*)
└── _ui/                              # 공통 UI 컴포넌트들
```

## 1. 공통 페이지

### 1.1 메인 랜딩 페이지 (`/`)
- **파일**: `src/app/page.tsx`
- **역할**: 서비스 소개 및 기능 설명, 로그인 상태에 따른 대시보드 리다이렉트
- **특징**: 사용자 역할에 따라 다른 대시보드로 자동 이동 (광고주 → `/advertiser`, 회원 → `/member`, 관리자 → `/admin`)

### 1.2 인증 페이지

#### 로그인 페이지 (`/login`)
- **파일**: `src/app/login/page.tsx`
- **역할**: 사용자 로그인
- **기능**: 이메일/비밀번호 로그인, 로그인 실패 시 리다이렉트

#### 회원가입 페이지 (`/signup`)
- **파일**: `src/app/signup/page.tsx`
- **역할**: 신규 사용자 회원가입
- **기능**: 이메일 인증 코드 발송 및 검증, 역할 선택 (광고주/회원)

## 2. 관리자 페이지 (`/admin/*`)

### 2.1 메인 대시보드 (`/admin`)
- **파일**: `src/app/admin/page.tsx`
- **역할**: 관리자 메인 대시보드
- **기능**:
  - 플랫폼 전체 지표 (검수 대기, 출금 대기, 오늘 승인/반려, 미션 현황, 캠페인 현황, 사용자 통계)
  - 검수 큐 목록 (최근 참여 검수 대기 항목)
  - 출금 큐 목록 (최근 출금 요청 항목)
  - 플랫폼 지표 (미션 잔여율, 출금 대기 금액, 캠페인 활성 비율)
  - 최근 활동 로그 (감사 로그)

### 2.2 광고주 관리 (`/admin/advertisers/*`)

#### 광고주 목록 (`/admin/advertisers`)
- **파일**: `src/app/admin/advertisers/page.tsx`
- **역할**: 광고주 목록 조회 및 관리
- **기능**: 광고주 검색, 목록 조회, 등록 버튼

#### 광고주 상세 (`/admin/advertisers/[id]`)
- **파일**: `src/app/admin/advertisers/[id]/page.tsx`
- **역할**: 특정 광고주의 상세 정보 및 관리
- **기능**: 광고주 정보 조회, 수정, 삭제, 담당 매니저 배정

#### 매니저 관리 (`/admin/managers/*`)

##### 매니저 목록 (`/admin/managers`)
- **파일**: `src/app/admin/managers/page.tsx`
- **역할**: 매니저 목록 조회 및 관리
- **기능**: 매니저 검색, 목록 조회, 신규 등록

##### 매니저 상세 (`/admin/managers/[id]`)
- **파일**: `src/app/admin/managers/[id]/page.tsx`
- **역할**: 특정 매니저의 상세 정보 및 관리
- **기능**: 매니저 정보 조회, 수정, 삭제, 담당 광고주 조회

##### 신규 매니저 등록 (`/admin/managers/new`)
- **파일**: `src/app/admin/managers/new/page.tsx`
- **역할**: 신규 매니저 등록
- **기능**: 매니저 정보 입력 및 생성

### 2.3 캠페인 관리 (`/admin/campaigns/*`)

#### 캠페인 목록 (`/admin/campaigns`)
- **파일**: `src/app/admin/campaigns/page.tsx`
- **역할**: 캠페인 목록 조회
- **기능**: 캠페인 검색 및 목록 조회

#### 캠페인 상세 (`/admin/campaigns/[id]`)
- **파일**: `src/app/admin/campaigns/[id]/page.tsx`
- **역할**: 특정 캠페인의 상세 정보
- **기능**: 캠페인 정보 조회, 참여자 목록

### 2.4 체험단 관리 (`/admin/experience/*`)

#### 체험단 캠페인 목록 (`/admin/experience`)
- **파일**: `src/app/admin/experience/page.tsx`
- **역할**: 체험단 캠페인 목록 조회 및 관리
- **기능**: 체험단 캠페인 검색, 목록 조회

#### 체험단 캠페인 상세 (`/admin/experience/[id]`)
- **파일**: `src/app/admin/experience/[id]/page.tsx`
- **역할**: 체험단 캠페인의 상세 정보 및 관리
- **기능**: 캠페인 정보 조회, 팀 신청 관리, 제출물 관리, 리포트 생성

#### 체험단 캠페인 상세 (`/admin/experience-campaigns/[id]`)
- **파일**: `src/app/admin/experience-campaigns/[id]/page.tsx`
- **역할**: 체험단 캠페인의 상세 정보 (별도 경로)
- **기능**: 캠페인 정보 조회, 팀 관리, 제출물 리뷰

### 2.5 참여 검수 (`/admin/reviews/*`)

#### 검수 목록 (`/admin/reviews`)
- **파일**: `src/app/admin/reviews/page.tsx`
- **역할**: 참여 검수 대기 목록
- **기능**: 검수 대기 참여 목록 조회 및 처리

#### 검수 상세 (`/admin/reviews/[id]`)
- **파일**: `src/app/admin/reviews/[id]/page.tsx`
- **역할**: 특정 참여의 검수 처리
- **기능**: 참여 증거 검토, 승인/반려 결정

### 2.6 정산 관리 (`/admin/payouts/*`)

#### 정산 목록 (`/admin/payouts`)
- **파일**: `src/app/admin/payouts/page.tsx`
- **역할**: 출금 요청 목록
- **기능**: 출금 요청 목록 조회 및 처리

#### 정산 상세 (`/admin/payouts/[id]`)
- **파일**: `src/app/admin/payouts/[id]/page.tsx`
- **역할**: 특정 출금 요청의 상세 정보 및 처리
- **기능**: 출금 요청 정보 조회, 승인/반려/보류 처리

### 2.7 상품 관리 (`/admin/products/*`)

#### 상품 목록 (`/admin/products`)
- **파일**: `src/app/admin/products/page.tsx`
- **역할**: 상품 목록 조회 및 관리
- **기능**: 상품 검색, 목록 조회, 신규 등록

#### 상품 상세 (`/admin/products/[id]`)
- **파일**: `src/app/admin/products/[id]/page.tsx`
- **역할**: 상품 상세 정보
- **기능**: 상품 정보 조회

### 2.8 리워드 캠페인 관리 (`/admin/reward/*`)

#### 리워드 캠페인 목록 (`/admin/reward/campaigns`)
- **파일**: `src/app/admin/reward/campaigns/page.tsx`
- **역할**: 리워드 캠페인 목록 조회
- **기능**: 캠페인 검색, 목록 조회

#### 리워드 캠페인 신규 생성 (`/admin/reward/campaigns/new`)
- **파일**: `src/app/admin/reward/campaigns/new/page.tsx`
- **역할**: 리워드 캠페인 생성
- **기능**: 캠페인 정보 입력 및 생성

#### 리워드 캠페인 상세 (`/admin/reward/campaigns/[id]`)
- **파일**: `src/app/admin/reward/campaigns/[id]/page.tsx`
- **역할**: 리워드 캠페인 상세 정보
- **기능**: 캠페인 정보 조회, 참여자 관리, 캠페인 제어 (활성화/일시정지)

### 2.9 정책 관리 (`/admin/policies`)
- **파일**: `src/app/admin/policies/page.tsx`
- **역할**: 시스템 정책 관리
- **기능**: 정책 조회 및 수정

### 2.10 내 정보 (`/admin/my-page`)
- **파일**: `src/app/admin/my-page/page.tsx`
- **역할**: 관리자 개인 정보 관리
- **기능**: 프로필 정보 조회 및 수정

## 3. 광고주 페이지 (`/advertiser/*`)

### 3.1 메인 대시보드 (`/advertiser`)
- **파일**: `src/app/advertiser/page.tsx`
- **역할**: 광고주 메인 대시보드
- **기능**: 캠페인 현황, 예산 현황, 최근 활동 등

### 3.2 매장 관리 (`/advertiser/places/*`)

#### 매장 목록 (`/advertiser/places`)
- **파일**: `src/app/advertiser/places/page.tsx`
- **역할**: 매장 목록 조회
- **기능**: 등록된 매장 목록 조회

#### 신규 매장 등록 (`/advertiser/places/new`)
- **파일**: `src/app/advertiser/places/new/page.tsx`
- **역할**: 신규 매장 등록
- **기능**: 매장 정보 입력 및 등록

### 3.3 캠페인 관리 (`/advertiser/campaigns/*`)

#### 캠페인 목록 (`/advertiser/campaigns`)
- **파일**: `src/app/advertiser/campaigns/page.tsx`
- **역할**: 캠페인 목록 조회
- **기능**: 생성한 캠페인 목록 조회

#### 신규 캠페인 생성 (`/advertiser/campaigns/new`)
- **파일**: `src/app/advertiser/campaigns/new/page.tsx`
- **역할**: 신규 캠페인 생성
- **기능**: 캠페인 정보 입력 및 생성

#### 캠페인 상세 (`/advertiser/campaigns/[id]`)
- **파일**: `src/app/advertiser/campaigns/[id]/page.tsx`
- **역할**: 캠페인 상세 정보
- **기능**: 캠페인 정보 조회, 참여자 현황, 캠페인 제어

### 3.4 상품 관리 (`/advertiser/products/*`)

#### 상품 목록 (`/advertiser/products`)
- **파일**: `src/app/advertiser/products/page.tsx`
- **역할**: 상품 목록 조회
- **기능**: 등록한 상품 목록 조회

#### 상품 상세 (`/advertiser/products/[id]`)
- **파일**: `src/app/advertiser/products/[id]/page.tsx`
- **역할**: 상품 상세 정보
- **기능**: 상품 정보 조회

### 3.5 상품 주문 (`/advertiser/product-orders`)
- **파일**: `src/app/advertiser/product-orders/page.tsx`
- **역할**: 상품 주문 관리
- **기능**: 주문 내역 조회 및 관리

### 3.6 리워드 관리 (`/advertiser/reward/*`)

#### 리워드 캠페인 목록 (`/advertiser/reward/campaigns`)
- **파일**: `src/app/advertiser/reward/campaigns/page.tsx`
- **역할**: 리워드 캠페인 목록 조회
- **기능**: 생성한 리워드 캠페인 목록

#### 리워드 캠페인 상세 (`/advertiser/reward/campaigns/[id]`)
- **파일**: `src/app/advertiser/reward/campaigns/[id]/page.tsx`
- **역할**: 리워드 캠페인 상세 정보
- **기능**: 캠페인 정보 조회, 참여 현황

#### 상품 목록 (`/advertiser/reward/products`)
- **파일**: `src/app/advertiser/reward/products/page.tsx`
- **역할**: 리워드 상품 목록
- **기능**: 리워드용 상품 목록 조회

#### 상품 상세 (`/advertiser/reward/products/[id]`)
- **파일**: `src/app/advertiser/reward/products/[id]/page.tsx`
- **역할**: 리워드 상품 상세
- **기능**: 상품 정보 조회

### 3.7 체험단 관리 (`/advertiser/experience/*`)

#### 체험단 신청 (`/advertiser/experience/new`)
- **파일**: `src/app/advertiser/experience/new/page.tsx`
- **역할**: 체험단 신청
- **기능**: 체험단 캠페인 신청 폼

#### 체험단 목록 (`/advertiser/experience`)
- **파일**: `src/app/advertiser/experience/page.tsx`
- **역할**: 체험단 캠페인 목록
- **기능**: 신청한 체험단 목록 조회

### 3.8 결제 및 청구 (`/advertiser/billing/*`)

#### 청구서 목록 (`/advertiser/billing`)
- **파일**: `src/app/advertiser/billing/page.tsx`
- **역할**: 청구서 및 결제 내역
- **기능**: 청구서 조회 및 결제

#### 토스페이먼츠 결제 (`/advertiser/billing/toss/*`)

##### 결제 페이지 (`/advertiser/billing/toss`)
- **파일**: `src/app/advertiser/billing/toss/page.tsx`
- **역할**: 토스페이먼츠 결제 페이지
- **기능**: 결제 정보 입력 및 처리

##### 결제 성공 (`/advertiser/billing/toss/success`)
- **파일**: `src/app/advertiser/billing/toss/success/page.tsx`
- **역할**: 결제 성공 페이지
- **기능**: 결제 완료 안내

##### 결제 실패 (`/advertiser/billing/toss/fail`)
- **파일**: `src/app/advertiser/billing/toss/fail/page.tsx`
- **역할**: 결제 실패 페이지
- **기능**: 결제 실패 안내 및 재시도

### 3.9 리포트 (`/advertiser/reports`)
- **파일**: `src/app/advertiser/reports/page.tsx`
- **역할**: 광고주 리포트
- **기능**: 캠페인 성과 리포트 조회

## 4. 회원 페이지 (`/member/*`)

### 4.1 메인 대시보드 (`/member`)
- **파일**: `src/app/member/page.tsx`
- **역할**: 회원 메인 대시보드
- **기능**: 참여 현황, 리워드 현황 등

### 4.2 체험단 관리 (`/member/experience/*`)

#### 체험단 목록 (`/member/experience`)
- **파일**: `src/app/member/experience/page.tsx`
- **역할**: 체험단 캠페인 목록
- **기능**: 참여 가능한 체험단 목록, 팀 관리, 제출물 관리

#### 체험단 참여 (`/member/experience/join`)
- **파일**: `src/app/member/experience/join/page.tsx`
- **역할**: 체험단 캠페인 참여
- **기능**: 체험단 참여 신청 및 팀 가입

### 4.3 리워드 관리 (`/member/reward/*`)

#### 리워드 캠페인 목록 (`/member/reward/campaigns`)
- **파일**: `src/app/member/reward/campaigns/page.tsx`
- **역할**: 리워드 캠페인 목록
- **기능**: 참여 가능한 캠페인 목록

#### 리워드 캠페인 상세 (`/member/reward/campaigns/[id]`)
- **파일**: `src/app/member/reward/campaigns/[id]/page.tsx`
- **역할**: 리워드 캠페인 상세
- **기능**: 캠페인 정보 조회, 참여 신청

#### 참여 내역 (`/member/reward/participations`)
- **파일**: `src/app/member/reward/participations/page.tsx`
- **역할**: 리워드 참여 내역
- **기능**: 참여한 캠페인 목록 및 상태 조회

#### 참여 상세 (`/member/reward/participations/[id]`)
- **파일**: `src/app/member/reward/participations/[id]/page.tsx`
- **역할**: 참여 상세 정보
- **기능**: 참여 정보 및 증거 제출 상태 조회

#### 정산 계좌 (`/member/reward/payouts/account`)
- **파일**: `src/app/member/reward/payouts/account/page.tsx`
- **역할**: 정산 계좌 관리
- **기능**: 정산 계좌 등록 및 조회

#### 정산 내역 (`/member/reward/payouts`)
- **파일**: `src/app/member/reward/payouts/page.tsx`
- **역할**: 정산 내역 조회
- **기능**: 출금 요청 및 내역 조회

#### 미션 목록 (`/member/reward/missions`)
- **파일**: `src/app/member/reward/missions/page.tsx`
- **역할**: 미션 목록
- **기능**: 참여 가능한 미션 목록

## 5. 개발용 페이지 (`/dev/*`)

### 5.1 부트스트랩 (`/dev/bootstrap`)
- **파일**: `src/app/dev/bootstrap/page.tsx`
- **역할**: 개발 환경 초기화
- **기능**: 테스트 데이터 및 설정 초기화

### 5.2 관리자 승격 (`/dev/promote-admin`)
- **파일**: `src/app/dev/promote-admin/page.tsx`
- **역할**: 사용자 관리자 권한 부여
- **기능**: 개발용 관리자 권한 설정

## 페이지 구조 원칙

### 1. 역할 기반 라우팅
- `/admin/*` - 관리자 전용
- `/advertiser/*` - 광고주 전용
- `/member/*` - 회원 전용
- 공통 페이지 (로그인, 회원가입 등)는 별도

### 2. CRUD 패턴
- 목록 페이지: `/[resource]` (예: `/admin/advertisers`)
- 신규 생성: `/[resource]/new` (예: `/admin/managers/new`)
- 상세 조회: `/[resource]/[id]` (예: `/admin/advertisers/[id]`)

### 3. 중첩 리소스
- 관련 리소스 간 계층 구조 (예: `/admin/campaigns/[id]/participations`)

### 4. 동적 세그먼트
- `[id]`, `[campaignId]`, `[teamId]` 등으로 리소스 식별
- Next.js App Router의 동적 라우팅 활용

### 5. 일관된 네이밍
- 영어 소문자 사용
- 복수형 리소스명 (advertisers, campaigns, etc.)
- 하이픈으로 단어 연결 (my-page, product-orders)