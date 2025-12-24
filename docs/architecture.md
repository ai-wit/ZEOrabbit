## LocalMom 아키텍처/설계 (Next.js App Router + Prisma + MySQL + Vercel)

---

## 1) 목표 아키텍처 요약

- **Web**: Next.js v14+ (App Router) + TypeScript + Tailwind
- **DB**: MySQL + Prisma
- **Deploy**: Vercel
- **핵심 원칙**
  - 돈/정산은 **원장(Ledger) 중심**
  - 미션 슬롯/쿼터는 **트랜잭션**으로 동시성 제어
  - 검수/OCR/부정탐지는 **비동기 Job**으로 분리(Vercel 서버리스 제약 대응)
  - 모든 중요 이벤트는 **감사로그(Audit Log)**로 남김

---

## 2) 컴포넌트 구성

### 2.1 Next.js (App Router) 레이어
- **RSC(Server Components)**: 대시보드/리포트처럼 읽기 위주 페이지
- **Client Components**: 미션 수행 플로우, 업로드 UI, 실시간 상태 갱신
- **Route Handlers (`app/api/...`)**:
  - 캠페인/미션/참여/검수/정산/관리자 API
  - 웹훅(결제/출금) 수신

### 2.2 도메인 서비스(권장 디렉토리)
- `src/domain/*`: 순수 도메인 로직(상태 전이, 정책 계산)
- `src/server/*`: DB/외부 연동(Prisma, PG, OCR, Queue)
- `src/app/*`: 라우트/페이지/서버액션/핸들러

### 2.3 비동기 처리(권장)
- **Job Queue**: Upstash QStash 또는 유사(HTTP 기반)
- **Worker**: `app/api/jobs/*` (서버리스 Worker 엔드포인트)
- **Cron**: Vercel Cron으로 “일별 미션 생성/정산 배치/리마인드” 수행

---

## 3) 핵심 플로우 설계

### 3.1 광고주: 캠페인 생성 → 일별 미션 생성

#### 설계 포인트
- 캠페인은 “기간/일일 목표/단가/보상”을 가진 **계약 단위**
- 시스템은 캠페인을 **일별 미션(MissionDay)** 로 분해
- 예산 소진은 참여 승인 시점(또는 미션 시작 시점 선점) 중 하나로 결정 필요
  - MVP 권장: **승인 시점 소진** (반려/타임아웃에 대한 예산 회계가 단순)

#### Pseudo code (상세)

```text
function createCampaign(input, actorAdvertiserId):
  assert actor is advertiser
  validate input:
    - placeId belongs to advertiser
    - startDate <= endDate
    - dailyTarget > 0
    - unitPrice >= policy.minUnitPrice[mType] AND <= policy.maxUnitPrice[mType]

  // Pricing / reward
  rewardPrice = calculateRewardPrice(unitPrice, policy.rewardRatio or fixedReward)

  // Budget
  totalDays = countDaysInclusive(startDate, endDate)
  budgetTotal = dailyTarget * totalDays * unitPrice

  // Ensure advertiser has enough budget credit (or allow negative by policy)
  ensureBudgetAvailable(advertiserId, budgetTotal, policy)

  // Persist campaign (status = DRAFT or ACTIVE depending on review)
  campaign = db.campaign.create({
    advertiserId, placeId, name, goalType,
    missionType, dailyTarget,
    startDate, endDate,
    unitPrice, rewardPrice,
    budgetTotal, status = DRAFT
  })

  // Optional: policy check / moderation
  enqueueJob("campaign.review", { campaignId })

  return campaign


function activateCampaign(campaignId, actorAdvertiserId):
  assert campaign belongs to advertiser
  assert campaign.status in (DRAFT, PAUSED)
  assert campaign.reviewStatus == APPROVED
  db.campaign.update(status = ACTIVE)

  // Create daily missions for date range (idempotent)
  for date in eachDate(campaign.startDate..campaign.endDate):
    upsert MissionDay(campaignId, date, quotaTotal=dailyTarget, quotaRemaining=dailyTarget, status=ACTIVE)

  return ok
```

### 3.2 리워더: 미션 탐색 → 슬롯 확보 → 수행 → 인증 제출

#### 설계 포인트
- “미션 시작하기”는 **슬롯 확보**이며, 동시성 이슈가 큼
- 슬롯 확보 시 `Participation`을 만들고 **만료시간(expiresAt)** 부여
- 슬롯 확보만으로는 비용 소진을 하지 않고(권장), 승인 시 원장 반영

#### Pseudo code (슬롯 확보, 트랜잭션)

```text
function claimMissionSlot(missionDayId, rewarderId):
  assert rewarder is not suspended
  assert within daily limits (per policy)

  return db.transaction(tx):
    missionDay = tx.missionDay.findUniqueForUpdate(missionDayId)
    assert missionDay.status == ACTIVE
    assert missionDay.quotaRemaining > 0

    // Prevent duplicate claim: rewarder already has active participation for this missionDay?
    assert tx.participation.none({
      missionDayId, rewarderId, status in (IN_PROGRESS, PENDING_REVIEW)
    })

    tx.missionDay.update({
      quotaRemaining = quotaRemaining - 1
    })

    participation = tx.participation.create({
      missionDayId, rewarderId,
      status = IN_PROGRESS,
      startedAt = now(),
      expiresAt = now() + policy.missionTimeoutByType[missionType],
      idempotencyKey = providedOrGeneratedKey
    })

    tx.auditLog.create("MISSION_CLAIMED", { participationId, rewarderId, missionDayId })

    return participation
```

#### Pseudo code (인증 제출)

```text
function submitEvidence(participationId, rewarderId, files, clientSignals):
  participation = db.participation.findUnique(participationId)
  assert participation.rewarderId == rewarderId
  assert participation.status == IN_PROGRESS
  assert now() <= participation.expiresAt

  // Store files (object storage recommended)
  evidenceRefs = upload(files)

  db.transaction(tx):
    tx.verificationEvidence.createMany({
      participationId, type=SCREENSHOT, fileRef in evidenceRefs,
      metadata = clientSignals
    })
    tx.participation.update(status = PENDING_REVIEW, submittedAt=now())
    tx.auditLog.create("EVIDENCE_SUBMITTED", { participationId })

  enqueueJob("verification.run", { participationId })
  return ok
```

### 3.3 검수 파이프라인: 자동 검수 → (필요 시) 수동 검수

#### 설계 포인트
- 자동 검수는 “신뢰 점수/신호”를 생성하고, 임계치에 따라 승인/반려/보류
- 수동 검수는 관리자 화면에서 처리(감사로그 필수)

#### Pseudo code (자동 검수)

```text
function runAutoVerification(participationId):
  p = db.participation.get(participationId)
  assert p.status == PENDING_REVIEW

  missionType = db.missionDay.get(p.missionDayId).missionType
  evidences = db.verificationEvidence.list(participationId)

  signals = []

  // 1) Duplicate image check (hash)
  for e in evidences where e.type == SCREENSHOT:
    hash = imageHash(e.fileRef)
    if db.imageHash.exists(hash, withinPolicyWindow):
      signals.push({ type: "DUP_IMAGE", severity: HIGH })
    db.imageHash.insert(hash, participationId)

  // 2) OCR extract & rule checks by mission type
  ocrText = ocr(evidences.primaryScreenshot)
  if missionType == TRAFFIC:
    assert ocrText contains placeName AND requiredUIHints else signals.push(...)
    assert timeOnPage >= 5 seconds based on clientSignals/log else signals.push(...)
  if missionType == SAVE:
    assert ocrText contains "저장됨" OR UI detection else signals.push(...)
  if missionType == SHARE:
    assert ocrText contains "링크가 복사" else signals.push(...)

  // 3) Rate/velocity checks
  if tooFastBetweenClaims(rewarderId, policy): signals.push({ type:"FAST", severity: MEDIUM })
  if repeatedIp(rewarderId, policy): signals.push({ type:"IP_REPEAT", severity: MEDIUM })

  // 4) Decide outcome
  decision = decide(signals, policy.thresholds)
    - APPROVE if no critical signals and pass required checks
    - REJECT if critical signals or missing required proof
    - NEED_MANUAL if ambiguous

  db.transaction(tx):
    tx.verificationResult.create({ participationId, autoDecision=decision, signals })
    if decision == APPROVE: approveParticipation(tx, participationId)
    if decision == REJECT: rejectParticipation(tx, participationId, reason=signalsSummary)
    if decision == NEED_MANUAL: tx.participation.update(status=MANUAL_REVIEW)
    tx.auditLog.create("AUTO_VERIFIED", { participationId, decision })

  return decision
```

#### Pseudo code (승인 시 원장 반영)

```text
function approveParticipation(tx, participationId):
  p = tx.participation.findForUpdate(participationId)
  assert p.status in (PENDING_REVIEW, MANUAL_REVIEW)

  missionDay = tx.missionDay.get(p.missionDayId)
  campaign = tx.campaign.get(missionDay.campaignId)

  // Budget ledger: advertiser pays unitPrice per approved completion
  tx.budgetLedger.create({
    advertiserId = campaign.advertiserId,
    amount = -campaign.unitPrice,
    reason = "MISSION_APPROVED",
    refId = participationId
  })

  // Credit ledger: rewarder receives rewardPrice
  tx.creditLedger.create({
    rewarderId = p.rewarderId,
    amount = +campaign.rewardPrice,
    reason = "MISSION_REWARD",
    refId = participationId
  })

  tx.participation.update(status=APPROVED, decidedAt=now())
```

---

## 4) API 설계(권장 엔드포인트)

### 4.1 광고주
- `POST /api/advertiser/campaigns`
- `POST /api/advertiser/campaigns/:id/activate`
- `POST /api/advertiser/campaigns/:id/pause`
- `GET  /api/advertiser/campaigns`
- `GET  /api/advertiser/campaigns/:id/report`
- `POST /api/advertiser/topups` (결제 생성)
- `POST /api/webhooks/payment` (PG 웹훅)

### 4.2 리워더
- `GET  /api/rewarder/missions/today`
- `POST /api/rewarder/participations` (슬롯 확보)
- `POST /api/rewarder/participations/:id/evidence`
- `GET  /api/rewarder/participations`
- `POST /api/rewarder/payouts`

### 4.3 관리자
- `GET  /api/admin/reviews`
- `POST /api/admin/participations/:id/approve`
- `POST /api/admin/participations/:id/reject`
- `POST /api/admin/payouts/:id/approve`
- `POST /api/admin/payouts/:id/reject`
- `POST /api/admin/policies`

---

## 5) 데이터/정합성 규칙(핵심)

- “슬롯 확보”는 `quota_remaining` 감소와 `Participation` 생성을 **같은 트랜잭션**으로 처리
- `CreditLedger`/`BudgetLedger`는 **refId 유니크**(같은 참여 건으로 중복 반영 방지)
- 상태 전이:
  - `IN_PROGRESS -> PENDING_REVIEW -> (APPROVED|REJECTED|MANUAL_REVIEW)`
  - 만료 시 `EXPIRED` 처리(필요 시 quota 반환 정책 결정)


