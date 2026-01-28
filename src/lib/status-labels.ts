import type {
  CampaignStatus,
  ExperienceApplicationStatus,
  ExperienceCampaignStatus,
  MissionDayStatus,
  ParticipationStatus,
  PaymentStatus,
  PayoutStatus,
  ProductOrderStatus,
  ReportStatus,
  SubmissionStatus,
  TeamMembershipStatus,
  TeamStatus,
  UserStatus,
} from "@prisma/client";

// NOTE: This module is intentionally UI-focused: it translates internal status codes
// into user-facing Korean labels. Keep enum values unchanged in DB/API.

export const UserStatusLabels: Record<UserStatus, string> = {
  ACTIVE: "활성",
  SUSPENDED: "정지됨",
  DELETED: "삭제됨",
};

export const ExperienceCampaignStatusLabels: Record<ExperienceCampaignStatus, string> = {
  DRAFT: "초안",
  ACTIVE: "모집 중",
  PAUSED: "일시 중지",
  ENDED: "마감",
};

export const ExperienceApplicationStatusLabels: Record<ExperienceApplicationStatus, string> = {
  DRAFT: "초안",
  BASIC_INFO_COMPLETED: "기본 정보 완료",
  PRICING_SELECTED: "요금제 선택 완료",
  PAYMENT_INFO_COMPLETED: "결제 정보 완료",
  PAYMENT_COMPLETED: "결제 완료",
  ADDITIONAL_INFO_COMPLETED: "추가 정보 완료",
  COMPLETED: "신청 완료",
  CANCELLED: "취소됨",
};

export const TeamStatusLabels: Record<TeamStatus, string> = {
  PENDING_LEADER_APPROVAL: "팀장 승인 대기",
  FORMING: "팀 구성 중",
  ACTIVE: "활성",
  COMPLETED: "완료됨",
  CANCELLED: "취소됨",
};

export const TeamMembershipStatusLabels: Record<TeamMembershipStatus, string> = {
  PENDING: "승인 대기",
  APPROVED: "승인됨",
  REJECTED: "거절됨",
  EXPIRED: "만료됨",
};

export const SubmissionStatusLabels: Record<SubmissionStatus, string> = {
  DRAFT: "초안",
  SUBMITTED: "제출됨",
  UNDER_REVIEW: "검토 중",
  APPROVED: "승인됨",
  REJECTED: "거절됨",
  REVISION_REQUESTED: "수정 요청",
};

export const ReportStatusLabels: Record<ReportStatus, string> = {
  PENDING: "생성 대기",
  GENERATED: "생성됨",
  UNDER_REVIEW: "검토 중",
  APPROVED: "승인됨",
  REJECTED: "거절됨",
};

export const CampaignStatusLabels: Record<CampaignStatus, string> = {
  DRAFT: "초안",
  ACTIVE: "진행 중",
  PAUSED: "일시 중지",
  ENDED: "종료됨",
};

export const MissionDayStatusLabels: Record<MissionDayStatus, string> = {
  ACTIVE: "활성",
  PAUSED: "일시 중지",
  ENDED: "종료됨",
};

export const ParticipationStatusLabels: Record<ParticipationStatus, string> = {
  IN_PROGRESS: "진행 중",
  PENDING_REVIEW: "검수 대기",
  MANUAL_REVIEW: "수동 검수",
  APPROVED: "승인됨",
  REJECTED: "반려됨",
  EXPIRED: "기한 만료",
  CANCELED: "취소됨",
};

export const PayoutStatusLabels: Record<PayoutStatus, string> = {
  REQUESTED: "출금 신청",
  APPROVED: "출금 승인",
  REJECTED: "출금 거절",
  PAID: "출금 완료",
  CANCELED: "출금 취소",
};

export const PaymentStatusLabels: Record<PaymentStatus, string> = {
  CREATED: "결제 대기",
  PAID: "결제 완료",
  FAILED: "결제 실패",
  CANCELED: "결제 취소",
  REFUNDED: "환불 완료",
};

export const ProductOrderStatusLabels: Record<ProductOrderStatus, string> = {
  CREATED: "주문 생성",
  PAID: "결제 완료",
  FULFILLED: "이행 완료",
  FAILED: "실패",
  CANCELED: "취소됨",
};

// Non-Prisma status used in member experience UI.
export type ExperienceUserStatus =
  | "available"
  | "applied_as_leader"
  | "applied_as_member"
  | "leader_application_pending"
  | "member"
  | "leader";

export const ExperienceUserStatusLabels: Record<ExperienceUserStatus, string> = {
  available: "참여 가능",
  applied_as_leader: "팀장 신청 중",
  applied_as_member: "팀원 신청 중",
  leader_application_pending: "팀장 승인 대기",
  member: "팀원",
  leader: "팀장",
};

function fallbackLabel(status: string): string {
  // If a new enum value is added but UI is not updated yet, keep behavior stable.
  return status;
}

export function getUserStatusLabel(status: UserStatus | string): string {
  return (UserStatusLabels as Record<string, string>)[status] ?? fallbackLabel(status);
}

export function getExperienceCampaignStatusLabel(status: ExperienceCampaignStatus | string): string {
  return (ExperienceCampaignStatusLabels as Record<string, string>)[status] ?? fallbackLabel(status);
}

export function getExperienceApplicationStatusLabel(status: ExperienceApplicationStatus | string): string {
  return (ExperienceApplicationStatusLabels as Record<string, string>)[status] ?? fallbackLabel(status);
}

export function getTeamStatusLabel(status: TeamStatus | string): string {
  return (TeamStatusLabels as Record<string, string>)[status] ?? fallbackLabel(status);
}

export function getTeamMembershipStatusLabel(status: TeamMembershipStatus | string): string {
  return (TeamMembershipStatusLabels as Record<string, string>)[status] ?? fallbackLabel(status);
}

export function getSubmissionStatusLabel(status: SubmissionStatus | string): string {
  return (SubmissionStatusLabels as Record<string, string>)[status] ?? fallbackLabel(status);
}

export function getReportStatusLabel(status: ReportStatus | string): string {
  return (ReportStatusLabels as Record<string, string>)[status] ?? fallbackLabel(status);
}

export function getCampaignStatusLabel(status: CampaignStatus | string): string {
  return (CampaignStatusLabels as Record<string, string>)[status] ?? fallbackLabel(status);
}

export function getMissionDayStatusLabel(status: MissionDayStatus | string): string {
  return (MissionDayStatusLabels as Record<string, string>)[status] ?? fallbackLabel(status);
}

export function getParticipationStatusLabel(status: ParticipationStatus | string): string {
  return (ParticipationStatusLabels as Record<string, string>)[status] ?? fallbackLabel(status);
}

export function getPayoutStatusLabel(status: PayoutStatus | string): string {
  return (PayoutStatusLabels as Record<string, string>)[status] ?? fallbackLabel(status);
}

export function getPaymentStatusLabel(status: PaymentStatus | string): string {
  return (PaymentStatusLabels as Record<string, string>)[status] ?? fallbackLabel(status);
}

export function getProductOrderStatusLabel(status: ProductOrderStatus | string): string {
  return (ProductOrderStatusLabels as Record<string, string>)[status] ?? fallbackLabel(status);
}

export function getExperienceUserStatusLabel(status: ExperienceUserStatus | string): string {
  return (ExperienceUserStatusLabels as Record<string, string>)[status] ?? fallbackLabel(status);
}
