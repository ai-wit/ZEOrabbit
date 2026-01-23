# ZEOrabbit API 라우트 구조

이 문서는 ZEOrabbit 프로젝트의 API 라우트(URI) 구조와 각 엔드포인트가 지원하는 HTTP 메소드를 정리합니다.

## 전체 구조 개요

```
api/
├── auth/                    # 인증 관련 (로그인, 회원가입, 이메일 인증)
├── admin/                   # 관리자 기능 (광고주/매니저/캠페인/정산 관리)
├── advertiser/             # 광고주 기능 (캠페인/상품/결제/체험단 관리)
├── member/                 # 회원 기능 (참여/리워드/팀/체험단)
├── rewarder/               # 리워더 기능 (참여/정산/대시보드)
├── payments/               # 결제 처리
├── uploads/                # 파일 업로드
├── webhooks/               # 외부 서비스 웹훅
├── cron/                   # 자동화 작업 (주기적 실행)
├── dev/                    # 개발용 기능 (시딩, 부트스트랩)
└── me/                     # 현재 사용자 정보
```

## 1. 인증 관련 API (`/api/auth/*`)

### 1.1 로그인 및 로그아웃
- `POST /api/auth/login` - 사용자 로그인
- `POST /api/auth/logout` - 사용자 로그아웃

### 1.2 회원가입 및 이메일 인증
- `POST /api/auth/signup` - 회원가입
- `POST /api/auth/send-verification` - 이메일 인증 코드 발송
- `POST /api/auth/verify-code` - 이메일 인증 코드 검증

## 2. 관리자 API (`/api/admin/*`)

### 2.1 대시보드
- `GET /api/admin/dashboard` - 관리자 대시보드 데이터

### 2.2 광고주 관리
- `GET /api/admin/advertisers` - 광고주 목록 조회
- `POST /api/admin/advertisers` - 광고주 등록
- `GET /api/admin/advertisers/[id]` - 광고주 상세 조회
- `PUT /api/admin/advertisers/[id]` - 광고주 정보 수정
- `DELETE /api/admin/advertisers/[id]` - 광고주 삭제
- `POST /api/admin/advertisers/[id]/assign-manager` - 광고주에 매니저 배정
- `DELETE /api/admin/advertisers/[id]/assign-manager` - 광고주 매니저 배정 해제

### 2.3 매니저 관리
- `GET /api/admin/managers` - 매니저 목록 조회
- `POST /api/admin/managers` - 매니저 등록
- `GET /api/admin/managers/[id]` - 매니저 상세 조회
- `PUT /api/admin/managers/[id]` - 매니저 정보 수정
- `DELETE /api/admin/managers/[id]` - 매니저 삭제
- `GET /api/admin/managers/assigned-advertisers` - 매니저별 담당 광고주 조회

### 2.4 현재 관리자 정보
- `GET /api/admin/me` - 현재 로그인한 관리자 정보 조회
- `PUT /api/admin/me` - 현재 관리자 정보 수정

### 2.5 캠페인 관리 (리워드 캠페인)
- `POST /api/admin/campaigns` - 캠페인 생성
- `GET /api/admin/campaigns/list` - 캠페인 목록 조회
- `GET /api/admin/campaigns/[id]` - 캠페인 상세 조회

### 2.6 체험단 캠페인 관리
- `GET /api/admin/experience-campaigns` - 체험단 캠페인 목록 조회
- `POST /api/admin/experience-campaigns` - 체험단 캠페인 생성
- `GET /api/admin/experience-campaigns/[id]` - 체험단 캠페인 상세 조회
- `PUT /api/admin/experience-campaigns/[id]` - 체험단 캠페인 수정
- `DELETE /api/admin/experience-campaigns/[id]` - 체험단 캠페인 삭제

### 2.7 체험단 신청 관리
- `POST /api/admin/experience-applications` - 체험단 신청 생성
- `GET /api/admin/experience-applications/[id]` - 체험단 신청 상세 조회

### 2.8 체험단 팀 관리
- `GET /api/admin/experience-campaigns/[id]/team-applications` - 팀 신청 목록 조회
- `POST /api/admin/experience-campaigns/[id]/approve-team` - 팀 승인
- `POST /api/admin/experience-campaigns/[id]/reject-team` - 팀 거부
- `POST /api/admin/experience-campaigns/[id]/approve-team-leader` - 팀 리더 승인

### 2.9 체험단 제출물 및 리포트
- `GET /api/admin/experience-campaigns/[id]/submissions` - 제출물 목록 조회
- `POST /api/admin/experience-campaigns/[id]/submissions/[submissionId]/review` - 제출물 리뷰
- `POST /api/admin/experience-campaigns/[id]/generate-report` - 리포트 생성
- `POST /api/admin/experience-campaigns/[id]/reports/[reportId]/approve` - 리포트 승인

### 2.10 참여 관리
- `GET /api/admin/participations/[id]` - 참여 상세 조회
- `POST /api/admin/participations/[id]/approve` - 참여 승인
- `POST /api/admin/participations/[id]/reject` - 참여 거부

### 2.11 정산 관리
- `GET /api/admin/payouts/[id]` - 정산 상세 조회
- `POST /api/admin/payouts/[id]/approve` - 정산 승인
- `POST /api/admin/payouts/[id]/reject` - 정산 거부
- `POST /api/admin/payouts/[id]/hold` - 정산 보류

### 2.12 상품 관리
- `GET /api/admin/products` - 상품 목록 조회
- `POST /api/admin/products` - 상품 생성
- `GET /api/admin/products/[id]` - 상품 상세 조회
- `POST /api/admin/products/[id]` - 상품 수정

### 2.13 리워드 캠페인 관리
- `GET /api/admin/reward/campaigns` - 리워드 캠페인 목록 조회
- `POST /api/admin/reward/campaigns` - 리워드 캠페인 생성
- `GET /api/admin/reward/campaigns/[id]` - 리워드 캠페인 상세 조회
- `PUT /api/admin/reward/campaigns/[id]` - 리워드 캠페인 수정
- `POST /api/admin/reward/campaigns/[id]/activate` - 리워드 캠페인 활성화
- `POST /api/admin/reward/campaigns/[id]/pause` - 리워드 캠페인 일시정지
- `GET /api/admin/reward/campaigns/[id]/participations` - 캠페인 참여자 목록

### 2.14 리워드 참여 관리
- `GET /api/admin/reward/participations/[id]` - 리워드 참여 상세 조회
- `POST /api/admin/reward/participations/[id]/approve` - 리워드 참여 승인
- `POST /api/admin/reward/participations/[id]/reject` - 리워드 참여 거부

### 2.15 상품 주문 관리
- `GET /api/admin/reward/product-orders` - 상품 주문 목록 조회
- `GET /api/admin/reward/product-orders/[id]` - 상품 주문 상세 조회

### 2.16 정책 관리
- `GET /api/admin/policies` - 정책 목록 조회
- `POST /api/admin/policies` - 정책 생성/수정

### 2.17 광고주 매장 관리
- `POST /api/admin/advertiser-places` - 광고주 매장 생성

## 3. 광고주 API (`/api/advertiser/*`)

### 3.1 대시보드
- `GET /api/advertiser/dashboard` - 광고주 대시보드

### 3.2 현재 광고주 정보
- `GET /api/advertiser/me` - 현재 로그인한 광고주 정보

### 3.3 매장 관리
- `GET /api/advertiser/places` - 매장 목록 조회
- `POST /api/advertiser/places` - 매장 등록

### 3.4 상품 관리
- `GET /api/advertiser/products` - 상품 목록 조회
- `GET /api/advertiser/products/[id]` - 상품 상세 조회

### 3.5 상품 주문
- `GET /api/advertiser/product-orders` - 상품 주문 목록 조회
- `POST /api/advertiser/product-orders` - 상품 주문 생성
- `POST /api/advertiser/product-orders/confirm` - 상품 주문 확인

### 3.6 상품 주문 제한
- `GET /api/advertiser/product-order-limits` - 상품 주문 제한 조회

### 3.7 리워드 캠페인
- `GET /api/advertiser/campaigns` - 캠페인 목록 조회
- `POST /api/advertiser/campaigns` - 캠페인 생성
- `GET /api/advertiser/campaigns/[campaignId]` - 캠페인 상세 조회
- `POST /api/advertiser/campaigns/[campaignId]/activate` - 캠페인 활성화

### 3.8 충전 관리
- `GET /api/advertiser/topups` - 충전 내역 조회
- `POST /api/advertiser/topups` - 충전 요청

### 3.9 체험단 관리
- `GET /api/advertiser/experience/pricing-plans` - 체험단 요금제 조회
- `GET /api/advertiser/experience/applications` - 체험단 신청 목록 조회
- `POST /api/advertiser/experience/applications` - 체험단 신청 생성
- `POST /api/advertiser/experience/applications/confirm` - 체험단 신청 확인
- `POST /api/advertiser/experience/applications/complete` - 체험단 신청 완료
- `GET /api/advertiser/experience/campaigns/[campaignId]/report` - 체험단 캠페인 리포트 조회

## 4. 회원 API (`/api/member/*`)

### 4.1 대시보드
- `GET /api/member/dashboard` - 회원 대시보드

### 4.2 팀 관리
- `GET /api/member/teams` - 팀 목록 조회
- `POST /api/member/teams` - 팀 생성
- `PUT /api/member/teams` - 팀 정보 수정
- `PATCH /api/member/teams` - 팀 부분 수정
- `GET /api/member/teams/[teamId]/memberships` - 팀 멤버십 조회
- `POST /api/member/teams/[teamId]/memberships` - 팀 멤버십 생성
- `DELETE /api/member/teams/[teamId]/memberships` - 팀 멤버십 삭제
- `GET /api/member/teams/[teamId]/invitations` - 팀 초대 목록 조회
- `POST /api/member/teams/[teamId]/invitations` - 팀 초대 생성
- `POST /api/member/teams/[teamId]/upload` - 팀 파일 업로드
- `GET /api/member/teams/[teamId]/submission` - 팀 제출물 조회
- `POST /api/member/teams/[teamId]/submission` - 팀 제출물 생성
- `POST /api/member/teams/apply-as-member` - 팀 멤버 신청

### 4.3 참여 관리
- `GET /api/member/participations` - 참여 목록 조회
- `POST /api/member/participations` - 참여 생성
- `GET /api/member/participations/[id]/evidence` - 참여 증거 조회
- `POST /api/member/participations/[id]/evidence` - 참여 증거 제출

### 4.4 리워드 관리
- `GET /api/member/reward/campaigns` - 리워드 캠페인 목록 조회
- `GET /api/member/reward/campaigns/[id]` - 리워드 캠페인 상세 조회
- `POST /api/member/reward/campaigns/[id]/join` - 리워드 캠페인 참여

### 4.5 체험단 관리
- `GET /api/member/experience-campaigns` - 체험단 캠페인 목록 조회
- `POST /api/member/experience-campaigns` - 체험단 캠페인 신청

### 4.6 초대 관리
- `GET /api/member/invitations` - 초대 목록 조회
- `POST /api/member/invitations` - 초대 생성

### 4.7 정산 계좌 관리
- `GET /api/member/payout-accounts` - 정산 계좌 목록 조회
- `POST /api/member/payout-accounts` - 정산 계좌 등록

### 4.8 정산 관리
- `GET /api/member/payouts` - 정산 내역 조회
- `POST /api/member/payouts` - 정산 신청

## 5. 리워더 API (`/api/rewarder/*`)

### 5.1 대시보드
- `GET /api/rewarder/dashboard` - 리워더 대시보드

### 5.2 참여 관리
- `GET /api/rewarder/participations` - 참여 목록 조회
- `POST /api/rewarder/participations` - 참여 생성
- `GET /api/rewarder/participations/[id]/evidence` - 참여 증거 조회
- `POST /api/rewarder/participations/[id]/evidence` - 참여 증거 제출

### 5.3 정산 계좌 관리
- `GET /api/rewarder/payout-accounts` - 정산 계좌 목록 조회
- `POST /api/rewarder/payout-accounts` - 정산 계좌 등록

### 5.4 정산 관리
- `GET /api/rewarder/payouts` - 정산 내역 조회
- `POST /api/rewarder/payouts` - 정산 신청

## 6. 결제 API (`/api/payments/*`)

### 6.1 결제 처리
- `POST /api/payments` - 결제 요청
- `POST /api/payments/confirm` - 결제 확인

## 7. 파일 업로드 API (`/api/uploads/*`)

### 7.1 파일 업로드
- `GET /api/uploads/[...path]` - 파일 다운로드

## 8. 웹훅 API (`/api/webhooks/*`)

### 8.1 외부 서비스 웹훅
- `POST /api/webhooks/payment` - 결제 웹훅
- `POST /api/webhooks/toss` - 토스페이먼츠 웹훅

## 9. 크론 작업 API (`/api/cron/*`)

### 9.1 자동화 작업
- `GET /api/cron/close-campaigns` - 캠페인 종료
- `GET /api/cron/close-experience-campaigns` - 체험단 캠페인 종료
- `GET /api/cron/expire-experience-memberships` - 체험단 멤버십 만료
- `GET /api/cron/expire-participations` - 참여 만료

## 10. 개발용 API (`/api/dev/*`)

### 10.1 개발 지원
- `POST /api/dev/bootstrap` - 부트스트랩
- `POST /api/dev/promote-admin` - 관리자 승격
- `POST /api/dev/seed` - 데이터 시딩

## 11. 현재 사용자 API (`/api/me`)

### 11.1 사용자 정보
- `GET /api/me` - 현재 로그인한 사용자 정보

## API 설계 원칙

### 1. RESTful 설계
- 리소스 기반 URL 구조 (명사 사용)
- HTTP 메소드로 CRUD 작업 표현
  - `GET` - 조회
  - `POST` - 생성
  - `PUT` - 전체 수정
  - `PATCH` - 부분 수정
  - `DELETE` - 삭제

### 2. 역할 기반 접근 제어
- `/api/admin/*` - 관리자 전용
- `/api/advertiser/*` - 광고주 전용
- `/api/member/*` - 회원 전용
- `/api/rewarder/*` - 리워더 전용

### 3. 계층적 구조
- 동적 세그먼트 (`[id]`, `[campaignId]`, `[teamId]` 등)로 리소스 식별
- 중첩 리소스 구조 (`campaigns/[id]/participations`)

### 4. 일관성
- 모든 API 응답은 JSON 형식
- 표준 HTTP 상태 코드 사용
- 일관된 에러 응답 형식