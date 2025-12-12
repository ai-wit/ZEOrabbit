-- ZEOrabbit base DDL for MySQL 8.x
-- Generated to match the intent of prisma/schema.prisma (manual, MVP-oriented).
-- Notes:
-- - Use utf8mb4 for full Unicode support.
-- - Monetary amounts are stored as INT (KRW).
-- - IDs are stored as VARCHAR(32) for cuid (Prisma default).

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS user (
  id VARCHAR(32) NOT NULL,
  role ENUM('ADVERTISER','REWARDER','ADMIN') NOT NULL,
  status ENUM('ACTIVE','SUSPENDED','DELETED') NOT NULL DEFAULT 'ACTIVE',
  email VARCHAR(255) NULL,
  name VARCHAR(255) NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS advertiser_profile (
  id VARCHAR(32) NOT NULL,
  userId VARCHAR(32) NOT NULL,
  displayName VARCHAR(255) NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_adv_userId (userId),
  CONSTRAINT fk_adv_user FOREIGN KEY (userId) REFERENCES user(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rewarder_profile (
  id VARCHAR(32) NOT NULL,
  userId VARCHAR(32) NOT NULL,
  level INT NOT NULL DEFAULT 1,
  trustScore INT NOT NULL DEFAULT 0,
  warningCount INT NOT NULL DEFAULT 0,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_rwd_userId (userId),
  CONSTRAINT fk_rwd_user FOREIGN KEY (userId) REFERENCES user(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS place (
  id VARCHAR(32) NOT NULL,
  advertiserId VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  externalProvider VARCHAR(64) NULL,
  externalId VARCHAR(128) NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_place_adv (advertiserId),
  KEY ix_place_external (externalProvider, externalId),
  CONSTRAINT fk_place_adv FOREIGN KEY (advertiserId) REFERENCES advertiser_profile(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS campaign (
  id VARCHAR(32) NOT NULL,
  advertiserId VARCHAR(32) NOT NULL,
  placeId VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  missionType ENUM('TRAFFIC','SAVE','SHARE') NOT NULL,
  dailyTarget INT NOT NULL,
  startDate DATETIME(3) NOT NULL,
  endDate DATETIME(3) NOT NULL,
  unitPriceKrw INT NOT NULL,
  rewardKrw INT NOT NULL,
  budgetTotalKrw INT NOT NULL,
  status ENUM('DRAFT','ACTIVE','PAUSED','ENDED') NOT NULL DEFAULT 'DRAFT',
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_campaign_adv_status (advertiserId, status),
  KEY ix_campaign_place (placeId),
  KEY ix_campaign_type (missionType),
  CONSTRAINT fk_campaign_adv FOREIGN KEY (advertiserId) REFERENCES advertiser_profile(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_campaign_place FOREIGN KEY (placeId) REFERENCES place(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mission_day (
  id VARCHAR(32) NOT NULL,
  campaignId VARCHAR(32) NOT NULL,
  date DATETIME(3) NOT NULL,
  quotaTotal INT NOT NULL,
  quotaRemaining INT NOT NULL,
  status ENUM('ACTIVE','PAUSED','ENDED') NOT NULL DEFAULT 'ACTIVE',
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_missionday_campaign_date (campaignId, date),
  KEY ix_missionday_date_status (date, status),
  KEY ix_missionday_campaign_status (campaignId, status),
  CONSTRAINT fk_missionday_campaign FOREIGN KEY (campaignId) REFERENCES campaign(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS participation (
  id VARCHAR(32) NOT NULL,
  missionDayId VARCHAR(32) NOT NULL,
  rewarderId VARCHAR(32) NOT NULL,
  status ENUM('IN_PROGRESS','PENDING_REVIEW','MANUAL_REVIEW','APPROVED','REJECTED','EXPIRED','CANCELED') NOT NULL DEFAULT 'IN_PROGRESS',
  startedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expiresAt DATETIME(3) NOT NULL,
  submittedAt DATETIME(3) NULL,
  decidedAt DATETIME(3) NULL,
  failureReason VARCHAR(1000) NULL,
  idempotencyKey VARCHAR(128) NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_participation_idem (idempotencyKey),
  KEY ix_participation_rewarder_status (rewarderId, status),
  KEY ix_participation_missionday_status (missionDayId, status),
  KEY ix_participation_expires (expiresAt),
  CONSTRAINT fk_participation_missionday FOREIGN KEY (missionDayId) REFERENCES mission_day(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_participation_rewarder FOREIGN KEY (rewarderId) REFERENCES rewarder_profile(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS verification_evidence (
  id VARCHAR(32) NOT NULL,
  participationId VARCHAR(32) NOT NULL,
  type VARCHAR(32) NOT NULL,
  fileRef VARCHAR(1000) NULL,
  metadataJson JSON NULL,
  ocrText LONGTEXT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_evidence_participation (participationId),
  CONSTRAINT fk_evidence_participation FOREIGN KEY (participationId) REFERENCES participation(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS verification_result (
  id VARCHAR(32) NOT NULL,
  participationId VARCHAR(32) NOT NULL,
  autoDecision ENUM('APPROVE','REJECT','NEED_MANUAL') NULL,
  manualDecision ENUM('APPROVE','REJECT','NEED_MANUAL') NULL,
  signalsJson JSON NULL,
  decidedByAdminId VARCHAR(32) NULL,
  decidedAt DATETIME(3) NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_result_participation (participationId),
  KEY ix_result_decider (decidedByAdminId),
  CONSTRAINT fk_result_participation FOREIGN KEY (participationId) REFERENCES participation(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_result_admin FOREIGN KEY (decidedByAdminId) REFERENCES user(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS credit_ledger (
  id VARCHAR(32) NOT NULL,
  rewarderId VARCHAR(32) NOT NULL,
  amountKrw INT NOT NULL,
  reason ENUM('MISSION_REWARD','MISSION_APPROVED_CHARGE','PAYOUT','PAYOUT_REVERSAL','TOPUP','REFUND','ADJUSTMENT') NOT NULL,
  refId VARCHAR(32) NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_credit_reason_ref (reason, refId),
  KEY ix_credit_rewarder_created (rewarderId, createdAt),
  CONSTRAINT fk_credit_rewarder FOREIGN KEY (rewarderId) REFERENCES rewarder_profile(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS budget_ledger (
  id VARCHAR(32) NOT NULL,
  advertiserId VARCHAR(32) NOT NULL,
  amountKrw INT NOT NULL,
  reason ENUM('MISSION_REWARD','MISSION_APPROVED_CHARGE','PAYOUT','PAYOUT_REVERSAL','TOPUP','REFUND','ADJUSTMENT') NOT NULL,
  refId VARCHAR(32) NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_budget_reason_ref (reason, refId),
  KEY ix_budget_adv_created (advertiserId, createdAt),
  CONSTRAINT fk_budget_adv FOREIGN KEY (advertiserId) REFERENCES advertiser_profile(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payout_account (
  id VARCHAR(32) NOT NULL,
  rewarderId VARCHAR(32) NOT NULL,
  bankName VARCHAR(100) NOT NULL,
  accountNumberMasked VARCHAR(64) NOT NULL,
  accountHolderName VARCHAR(100) NULL,
  isPrimary TINYINT(1) NOT NULL DEFAULT 1,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_payout_account_rewarder_primary (rewarderId, isPrimary),
  CONSTRAINT fk_payout_account_rewarder FOREIGN KEY (rewarderId) REFERENCES rewarder_profile(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payout_request (
  id VARCHAR(32) NOT NULL,
  rewarderId VARCHAR(32) NOT NULL,
  payoutAccountId VARCHAR(32) NOT NULL,
  amountKrw INT NOT NULL,
  status ENUM('REQUESTED','APPROVED','REJECTED','PAID','CANCELED') NOT NULL DEFAULT 'REQUESTED',
  failureReason VARCHAR(1000) NULL,
  idempotencyKey VARCHAR(128) NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  decidedAt DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_payout_idem (idempotencyKey),
  KEY ix_payout_rewarder_status_created (rewarderId, status, createdAt),
  KEY ix_payout_status_created (status, createdAt),
  CONSTRAINT fk_payout_rewarder FOREIGN KEY (rewarderId) REFERENCES rewarder_profile(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_payout_account FOREIGN KEY (payoutAccountId) REFERENCES payout_account(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment (
  id VARCHAR(32) NOT NULL,
  advertiserId VARCHAR(32) NOT NULL,
  amountKrw INT NOT NULL,
  status ENUM('CREATED','PAID','FAILED','CANCELED','REFUNDED') NOT NULL DEFAULT 'CREATED',
  provider VARCHAR(64) NULL,
  providerRef VARCHAR(128) NULL,
  idempotencyKey VARCHAR(128) NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_payment_providerRef (providerRef),
  UNIQUE KEY uq_payment_idem (idempotencyKey),
  KEY ix_payment_adv_status_created (advertiserId, status, createdAt),
  CONSTRAINT fk_payment_adv FOREIGN KEY (advertiserId) REFERENCES advertiser_profile(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fraud_signal (
  id VARCHAR(32) NOT NULL,
  rewarderId VARCHAR(32) NOT NULL,
  participationId VARCHAR(32) NULL,
  type VARCHAR(64) NOT NULL,
  severity INT NOT NULL DEFAULT 1,
  payloadJson JSON NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_fraud_rewarder_created (rewarderId, createdAt),
  KEY ix_fraud_type_created (type, createdAt),
  CONSTRAINT fk_fraud_rewarder FOREIGN KEY (rewarderId) REFERENCES rewarder_profile(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_fraud_participation FOREIGN KEY (participationId) REFERENCES participation(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS blacklist (
  id VARCHAR(32) NOT NULL,
  type VARCHAR(32) NOT NULL,
  value VARCHAR(255) NOT NULL,
  reason VARCHAR(1000) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_blacklist_type_value (type, value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS policy (
  id VARCHAR(32) NOT NULL,
  `key` ENUM('PRICING','REWARD','FRAUD','PAYOUT','MISSION_LIMITS') NOT NULL,
  version INT NOT NULL DEFAULT 1,
  payloadJson JSON NOT NULL,
  isActive TINYINT(1) NOT NULL DEFAULT 1,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_policy_key_active_created (`key`, isActive, createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification (
  id VARCHAR(32) NOT NULL,
  userId VARCHAR(32) NOT NULL,
  channel VARCHAR(32) NOT NULL,
  type VARCHAR(64) NOT NULL,
  payloadJson JSON NULL,
  readAt DATETIME(3) NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_notification_user_created (userId, createdAt),
  KEY ix_notification_type_created (type, createdAt),
  CONSTRAINT fk_notification_user FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_log (
  id VARCHAR(32) NOT NULL,
  actorUserId VARCHAR(32) NULL,
  action VARCHAR(64) NOT NULL,
  targetType VARCHAR(64) NULL,
  targetId VARCHAR(64) NULL,
  payloadJson JSON NULL,
  ip VARCHAR(64) NULL,
  userAgent VARCHAR(512) NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_audit_actor_created (actorUserId, createdAt),
  KEY ix_audit_action_created (action, createdAt),
  KEY ix_audit_target (targetType, targetId),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actorUserId) REFERENCES user(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;


