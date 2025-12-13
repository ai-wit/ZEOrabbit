## DEV 테스트 데이터 / 테스트 계정 가이드

이 문서는 로컬 개발 환경에서 **초기 데이터 생성(Seed)** 과 **테스트 로그인 계정**을 빠르게 준비하기 위한 가이드입니다.

### 전제 조건

- **DB**: 로컬 MySQL
- **ENV**: `config/env.local`에 `DATABASE_URL` 설정
- **Next.js**: `npm run dev`로 실행 (개발 환경에서만 seed 엔드포인트가 동작)

---

## 1) 로컬 DB / Prisma 준비

### 1-1. 환경 변수 확인

현재 레포 기본값:

```text
config/env.local
DATABASE_URL="mysql://root:1234@localhost:3306/zeorabbit"
```

### 1-2. DB 생성/마이그레이션

```bash
npm install
npx prisma generate
npx prisma migrate dev
```

### 1-3. 개발 서버 실행

```bash
npm run dev
```

---

## 2) Seed 데이터 생성 (추천: `/api/dev/seed`)

### 실행 방법

개발 서버 실행 후 아래를 호출합니다:

```bash
curl -X POST http://localhost:3000/api/dev/seed
```

- **주의**: `NODE_ENV=production`에서는 동작하지 않고 `/`로 리다이렉트됩니다.
- **특징**: 대부분 **idempotent(중복 생성 방지)** 하게 설계되어 여러 번 실행해도 안전합니다.

### 생성되는 테스트 계정

비밀번호는 모두 동일합니다:

- **비밀번호**: `password123!`

계정 목록:

- **ADMIN**
  - `admin+1@example.com`
  - `admin+2@example.com`
- **ADVERTISER**
  - `advertiser+1@example.com`
  - `advertiser+2@example.com`
- **REWARDER**
  - `rewarder+1@example.com` ~ `rewarder+6@example.com`

### 생성되는 주요 데이터(요약)

`src/app/api/dev/seed/route.ts` 기준:

- **정책(Policy)**
  - `PRICING` (TRAFFIC/SAVE/SHARE 비율/단가 범위)
  - `MISSION_LIMITS` (타입별 timeout)
  - `PAYOUT` (min payout)
- **광고주 예산**
  - 광고주별 **충전(Topup)** + Budget Ledger 생성
- **플레이스**
  - `"상도동 막걸리 우이락"`, `"연남동 카페 토끼"`
- **캠페인**
  - `SEED 트래픽 캠페인 (ACTIVE)` (TRAFFIC)
  - `SEED 저장 캠페인 (ACTIVE)` (SAVE)
  - `SEED 공유 캠페인 (ACTIVE)` (SHARE)
  - `SEED 저장 캠페인 (DRAFT)` (SAVE)
- **오늘의 MissionDay**
  - 위 ACTIVE 캠페인들에 대해 **오늘 날짜 MissionDay ACTIVE** 생성
- **참여(Participation) 시나리오**
  - `IN_PROGRESS`, `PENDING_REVIEW`, `MANUAL_REVIEW`, `APPROVED`, `REJECTED`, `EXPIRED` 등 다양한 상태 생성
  - 일부는 **증빙(VerificationEvidence)** 포함
  - APPROVED 일부는 **크레딧(CreditLedger)** 적립 포함
- **출금(Payout) 시나리오**
  - `REQUESTED`, `APPROVED` 상태의 출금 요청을 만들어 관리자 처리 플로우 테스트 가능
- **감사 로그(AuditLog)**
  - seed 실행 및 생성 이벤트 기록

---

## 3) 간단 데모 데이터 (옵션: `/api/dev/bootstrap`)

`/api/dev/seed`보다 가벼운 단일 데모 세트를 만들고 싶다면:

```bash
curl -X POST http://localhost:3000/api/dev/bootstrap
```

생성되는 계정(비밀번호 동일: `password123!`):

- `advertiser@example.com`
- `rewarder@example.com`
- `admin@example.com`

그리고 최소한의 place/campaign/mission day/검수 대기 1건/출금 요청 1건을 만들어줍니다.

---

## 4) 로그인 방법

### UI로 로그인

브라우저에서:

- `/login` 접속 → 이메일/비밀번호 입력

### curl로 로그인(세션 쿠키 발급)

```bash
curl -i -c /tmp/zeo-cookies.txt \
  -X POST http://localhost:3000/api/auth/login \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data 'email=admin%2B1%40example.com&password=password123!'
```

쿠키를 이용해 페이지 접근:

```bash
curl -b /tmp/zeo-cookies.txt http://localhost:3000/admin
```

---

## 5) 초기화(완전 리셋)

DB를 완전히 초기화하고 다시 seed 하고 싶다면:

```bash
npx prisma migrate reset --force
```

그 다음 `/api/dev/seed` 또는 `/api/dev/bootstrap`을 다시 호출합니다.


