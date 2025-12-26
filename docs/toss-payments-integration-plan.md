# 토스페이먼츠 결제 시스템 적용 계획

## 개요

현재 ZEOrabbit 프로젝트에 토스페이먼츠 결제 시스템을 적용하여 광고주의 충전과 체험단 신청 결제를 실현한다.

## 현재 상태 분석

### ✅ 기존 인프라 활용 가능
- **Payment 모델**: `provider`, `providerRef` 필드가 이미 존재
- **웹훅 시스템**: `api/webhooks/payment`에서 providerRef 기반 결제 상태 업데이트
- **BudgetLedger**: 결제 완료 시 TOPUP으로 예산 충전 로직 존재
- **ExperienceApplication**: 체험단 신청 결제 연동 준비됨

### ❌ 현재 결제 시스템 상태
- DEV provider로 즉시 결제 완료 (개발용)
- 체험단 신청 Step 3,4: "개발 진행 중" 상태
- 실제 결제 UI/로직 부재

## 적용 범위

### 1. 토스페이먼츠 결제 관련 구현
#### 1.1 환경 설정
```bash
# .env.local에 추가
TOSS_PAYMENTS_CLIENT_KEY=test_ck_...
TOSS_PAYMENTS_SECRET_KEY=test_sk_...
TOSS_PAYMENTS_WEBHOOK_SECRET_KEY=test_wh_...
```

#### 1.2 코어 라이브러리 구현
- `src/lib/toss-payments.ts`: 결제 확인, 조회, 웹훅 검증 함수
- `src/types/tosspayments.d.ts`: 클라이언트 SDK 타입 정의

#### 1.3 API 구현
- `src/app/api/payments/route.ts`: 결제 생성
- `src/app/api/payments/confirm/route.ts`: 결제 확인
- `src/app/api/webhooks/toss/route.ts`: 토스 웹훅 처리 (시그니처 검증)

#### 1.4 의존성 추가
```json
// package.json
"@tosspayments/payment-widget-sdk": "^1.2.0"
```

### 2. 광고주의 [결제/충전] 페이지 적용
#### 2.1 결제 옵션 추가 (DEV 기능 유지)
```tsx
// 기존 DEV 즉시 반영 + 토스페이먼츠 카드 결제 옵션
<form action="/api/advertiser/topups" method="post">
  <select name="paymentMethod">
    <option value="DEV">DEV 즉시 반영 (개발용)</option>
    <option value="TOSS">토스페이먼츠 카드 결제</option>
  </select>
</form>
```

#### 2.2 결제 플로우
1. 금액 입력 → 결제 수단 선택
2. TOSS 선택 시 토스페이먼츠 결제 위젯 표시
3. 결제 완료 후 리다이렉트 → 결제 확인 → 예산 충전

### 3. 체험단 신청 결제 적용
#### 3.1 Step 3: 결제 정보 입력
```tsx
// 현재 "개발 진행 중" → 실제 결제 UI 구현
interface PaymentInfo {
  paymentMethod: 'CARD' | 'BANK_TRANSFER';
  taxInvoiceRequested: boolean;
  taxInvoiceInfo?: Json;
}

// 결제 수단 선택 + 세금계산서 정보 입력
```

#### 3.2 Step 4: 결제 완료
```tsx
// 결제 성공 시 ExperienceApplication.status = 'PAYMENT_COMPLETED'
// Payment 생성 및 연결
// BudgetLedger에 TOPUP 기록 (체험단용)
```

## 구현 단계

### Phase 1: 토스페이먼츠 코어 구현 (1-2일)
1. 환경변수 추가 및 검증
2. 토스페이먼츠 라이브러리 구현 (`lib/toss-payments.ts`)
3. 타입 정의 추가 (`types/tosspayments.d.ts`)
4. 결제 생성/확인 API 구현
5. 웹훅 처리 API 구현 (시그니처 검증)

### Phase 2: 충전 기능 적용 (1일)
1. 충전 페이지에 토스페이먼츠 옵션 추가 (DEV 유지)
2. 결제 위젯 연동
3. 결제 성공/실패 페이지 구현
4. 기존 topups API 수정 (paymentMethod 분기)

### Phase 3: 체험단 신청 결제 적용 (2일)
1. Step 3 결제 정보 입력 UI 구현
2. Step 4 결제 완료 UI 구현
3. ExperienceApplication 결제 로직 구현
4. Payment ↔ ExperienceApplication 연결

### Phase 4: 테스트 및 검증 (1-2일)
1. 단위 테스트 작성
2. 통합 테스트 (결제 플로우)
3. 웹훅 테스트 (시그니처 검증)
4. 실제 결제 테스트 (테스트 키 사용)

### Phase 5: 사이드 이펙트 검증 (1일)
1. 기존 DEV 기능 영향도 확인
2. 데이터베이스 마이그레이션 검증
3. 에러 처리 및 롤백 시나리오 검증
4. 성능 영향도 분석

## 테스트 전략

### 4.1 단위 테스트
```bash
# 토스페이먼츠 라이브러리 함수 테스트
- confirmTossPayment()
- verifyTossWebhookSignature()
- getTossPayment()
```

### 4.2 통합 테스트
```bash
# 결제 플로우 E2E 테스트
- 충전: 금액 입력 → 토스 결제 → 성공 리다이렉트 → 예산 반영
- 체험단: 요금제 선택 → 결제 정보 입력 → 토스 결제 → 신청 완료
```

### 4.3 웹훅 테스트
```bash
# 실제 토스페이먼츠 웹훅 시뮬레이션
- 시그니처 검증
- 결제 상태 업데이트
- 에러 케이스 처리
```

## 사이드 이펙트 검증 체크리스트

### 5.1 기능 영향도
- [ ] 기존 DEV 즉시 결제 기능 유지 확인
- [ ] Payment/BudgetLedger 데이터 일관성 유지
- [ ] ExperienceApplication 상태 전이 정상 동작

### 5.2 데이터베이스 영향도
- [ ] 새로운 Payment 레코드 생성 시 기존 쿼리 영향 없음
- [ ] provider/providerRef 필드 사용으로 인한 인덱스 영향 없음
- [ ] BudgetLedger TOPUP 로직 변경으로 인한 계산 오류 없음

### 5.3 보안 영향도
- [ ] 웹훅 시그니처 검증으로 인한 보안 강화
- [ ] 환경변수 노출 방지
- [ ] 결제 키 관리 안전성 확인

### 5.4 성능 영향도
- [ ] 결제 API 응답 시간 영향도 측정
- [ ] 웹훅 처리 성능 영향도 측정
- [ ] 데이터베이스 쿼리 성능 영향도 측정

## 마이그레이션 전략

### 기존 데이터 호환성
- Payment.status: CREATED → TOSS 결제 시작
- Payment.status: PAID → 결제 완료 (기존 DEV 포함)
- provider: "DEV" → 기존 즉시 결제
- provider: "TOSS" → 토스페이먼츠 결제

### 롤백 계획
1. 토스페이먼츠 관련 코드 주석 처리
2. 환경변수 제거
3. UI에서 토스 옵션 숨김
4. DEV 옵션만 유지

## 예상 일정

- **총 기간**: 5-7일
- **Phase 1**: 1-2일 (토스 코어)
- **Phase 2**: 1일 (충전 기능)
- **Phase 3**: 2일 (체험단 결제)
- **Phase 4**: 1-2일 (테스트)
- **Phase 5**: 1일 (검증)

## 위험 요소 및 완화 방안

### 1. 토스페이먼츠 API 변경 가능성
- **완화**: suzuki 프로젝트 검증된 코드 재활용

### 2. 결제 실패 시 데이터 정합성
- **완화**: 트랜잭션 처리 + 웹훅 보장

### 3. 기존 기능 영향도
- **완화**: DEV 기능 유지 + 점진적 적용

### 4. 보안 취약점
- **완화**: 시그니처 검증 + 환경변수 암호화
