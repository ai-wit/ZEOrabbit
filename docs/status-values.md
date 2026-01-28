# Status Values (상태값) 가이드

이 문서는 DB/도메인에서 사용하는 **status enum 값**(영문 코드)을 UI에서 **일관된 한글 라벨**로 표기하기 위한 기준을 정의합니다.

- **원칙**: DB/API에는 영문 enum 값을 그대로 유지하고, **표시(UI)에서만** 한글 라벨로 변환합니다.
- **구현 위치**: `src/lib/status-labels.ts`

---

## 1) PaymentStatus (결제 상태)

| 코드 | 한글 표기 | 의미 |
|---|---|---|
| CREATED | 결제 대기 | 결제 레코드가 생성되었으나 승인/완료 전 |
| PAID | 결제 완료 | 결제 승인 완료 |
| FAILED | 결제 실패 | 결제 승인/처리 실패 |
| CANCELED | 결제 취소 | 결제가 취소됨 |
| REFUNDED | 환불 완료 | 환불 처리 완료 |

### 전이(대표)
- CREATED → PAID (결제 승인)
- CREATED → FAILED (승인 실패)
- PAID → REFUNDED (환불)
- CREATED/PAID → CANCELED (취소)

---

## 2) PayoutStatus (출금 상태)

| 코드 | 한글 표기 | 의미 |
|---|---|---|
| REQUESTED | 출금 신청 | 리워더가 출금 요청 |
| APPROVED | 출금 승인 | 관리자가 승인(송금 대기) |
| PAID | 출금 완료 | 실제 송금 완료 |
| REJECTED | 출금 거절 | 관리자가 거절 |
| CANCELED | 출금 취소 | 신청이 취소됨 |

### 전이(대표)
- REQUESTED → APPROVED → PAID
- REQUESTED/APPROVED → REJECTED
- REQUESTED/APPROVED → CANCELED

---

## 3) CampaignStatus (캠페인 상태)

| 코드 | 한글 표기 | 의미 |
|---|---|---|
| DRAFT | 초안 | 작성/준비 중 |
| ACTIVE | 진행 중 | 활성 상태 |
| PAUSED | 일시 중지 | 임시 중단 |
| ENDED | 종료됨 | 종료(기간 만료 또는 종료 처리) |

---

## 4) MissionDayStatus (미션 일자 상태)

| 코드 | 한글 표기 | 의미 |
|---|---|---|
| ACTIVE | 활성 | 진행 가능 |
| PAUSED | 일시 중지 | 임시 중단 |
| ENDED | 종료됨 | 해당 일자 종료 |

---

## 5) ParticipationStatus (참여 상태)

| 코드 | 한글 표기 | 의미 |
|---|---|---|
| IN_PROGRESS | 진행 중 | 참여/미션 수행 중 |
| PENDING_REVIEW | 검수 대기 | 제출 후 자동 검수 대기 |
| MANUAL_REVIEW | 수동 검수 | 관리자 확인 필요 |
| APPROVED | 승인됨 | 검수 통과 |
| REJECTED | 반려됨 | 검수 실패 |
| EXPIRED | 기한 만료 | 제출/수행 기한 초과 |
| CANCELED | 취소됨 | 참여 취소 |

---

## 6) ProductOrderStatus (상품 주문 상태)

| 코드 | 한글 표기 | 의미 |
|---|---|---|
| CREATED | 주문 생성 | 주문 생성됨(결제 전/대기) |
| PAID | 결제 완료 | 결제 승인됨 |
| FULFILLED | 이행 완료 | 주문 이행 완료(내부 처리 완료) |
| FAILED | 실패 | 처리 실패 |
| CANCELED | 취소됨 | 주문 취소 |

---

## 7) TeamStatus (팀 상태)

| 코드 | 한글 표기 | 의미 |
|---|---|---|
| PENDING_LEADER_APPROVAL | 팀장 승인 대기 | 팀장 신청 승인 대기 |
| FORMING | 팀 구성 중 | 팀원 모집/구성 중 |
| ACTIVE | 활성 | 구성 완료/활동 중 |
| COMPLETED | 완료됨 | 체험/활동 완료 |
| CANCELLED | 취소됨 | 팀 취소 |

---

## 8) TeamMembershipStatus (팀 멤버십 상태)

| 코드 | 한글 표기 | 의미 |
|---|---|---|
| PENDING | 승인 대기 | 가입 요청 검토 중 |
| APPROVED | 승인됨 | 가입 승인 |
| REJECTED | 거절됨 | 가입 거절 |
| EXPIRED | 만료됨 | 만료 |

---

## 9) ExperienceCampaignStatus (체험 캠페인 상태)

| 코드 | 한글 표기 | 의미 |
|---|---|---|
| DRAFT | 초안 | 작성/준비 중 |
| ACTIVE | 모집 중 | 모집 진행 |
| PAUSED | 일시 중지 | 임시 중단 |
| ENDED | 마감 | 모집 종료 |

---

## 10) ExperienceApplicationStatus (체험 신청서 상태)

| 코드 | 한글 표기 | 의미 |
|---|---|---|
| DRAFT | 초안 | 작성 중 |
| BASIC_INFO_COMPLETED | 기본 정보 완료 | 기본 정보 입력 완료 |
| PRICING_SELECTED | 요금제 선택 완료 | 요금제 선택 완료 |
| PAYMENT_INFO_COMPLETED | 결제 정보 완료 | 결제 정보 입력 완료 |
| PAYMENT_COMPLETED | 결제 완료 | 결제 승인 완료 |
| ADDITIONAL_INFO_COMPLETED | 추가 정보 완료 | 추가 정보 입력 완료 |
| COMPLETED | 신청 완료 | 전체 플로우 완료 |
| CANCELLED | 취소됨 | 신청 취소 |

---

## 11) SubmissionStatus (제출물 상태)

| 코드 | 한글 표기 | 의미 |
|---|---|---|
| DRAFT | 초안 | 작성 중 |
| SUBMITTED | 제출됨 | 제출 완료 |
| UNDER_REVIEW | 검토 중 | 검토 진행 |
| APPROVED | 승인됨 | 승인 |
| REJECTED | 거절됨 | 거절 |
| REVISION_REQUESTED | 수정 요청 | 수정 후 재제출 필요 |

---

## 12) ReportStatus (리포트 상태)

| 코드 | 한글 표기 | 의미 |
|---|---|---|
| PENDING | 생성 대기 | 생성 전 |
| GENERATED | 생성됨 | 생성 완료 |
| UNDER_REVIEW | 검토 중 | 검토 진행 |
| APPROVED | 승인됨 | 승인 |
| REJECTED | 거절됨 | 거절 |

---

## 13) UserStatus (사용자 상태)

| 코드 | 한글 표기 | 의미 |
|---|---|---|
| ACTIVE | 활성 | 정상 |
| SUSPENDED | 정지됨 | 이용 제한 |
| DELETED | 삭제됨 | 탈퇴/삭제 |

