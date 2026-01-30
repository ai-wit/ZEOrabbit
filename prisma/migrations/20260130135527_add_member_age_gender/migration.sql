-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `role` ENUM('ADVERTISER', 'MEMBER', 'ADMIN') NOT NULL,
    `status` ENUM('ACTIVE', 'SUSPENDED', 'DELETED') NOT NULL DEFAULT 'ACTIVE',
    `memberType` ENUM('NORMAL', 'TEAM_LEADER', 'TEAM_PRO_LEADER') NULL,
    `adminType` ENUM('SUPER', 'MANAGER') NULL,
    `email` VARCHAR(191) NULL,
    `name` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuthCredential` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AuthCredential_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Session_tokenHash_key`(`tokenHash`),
    INDEX `Session_userId_expiresAt_idx`(`userId`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TermsAgreement` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('SERVICE', 'PRIVACY', 'REWARDER_GUIDE') NOT NULL,
    `version` VARCHAR(191) NOT NULL,
    `acceptedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TermsAgreement_userId_acceptedAt_idx`(`userId`, `acceptedAt`),
    UNIQUE INDEX `TermsAgreement_userId_type_version_key`(`userId`, `type`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdvertiserProfile` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NULL,
    `businessNumber` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AdvertiserProfile_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MemberProfile` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `age` INTEGER NULL,
    `gender` VARCHAR(191) NULL,
    `level` INTEGER NOT NULL DEFAULT 1,
    `trustScore` INTEGER NOT NULL DEFAULT 0,
    `warningCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MemberProfile_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Place` (
    `id` VARCHAR(191) NOT NULL,
    `advertiserId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `url` TEXT NULL,
    `externalProvider` VARCHAR(191) NULL,
    `externalId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Place_advertiserId_idx`(`advertiserId`),
    INDEX `Place_externalProvider_externalId_idx`(`externalProvider`, `externalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Campaign` (
    `id` VARCHAR(191) NOT NULL,
    `advertiserId` VARCHAR(191) NOT NULL,
    `placeId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `missionType` ENUM('TRAFFIC', 'SAVE', 'SHARE') NOT NULL,
    `dailyTarget` INTEGER NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `unitPriceKrw` INTEGER NOT NULL,
    `rewardKrw` INTEGER NOT NULL,
    `budgetTotalKrw` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'ENDED') NOT NULL DEFAULT 'DRAFT',
    `missionText` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Campaign_advertiserId_status_idx`(`advertiserId`, `status`),
    INDEX `Campaign_placeId_idx`(`placeId`),
    INDEX `Campaign_missionType_idx`(`missionType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CampaignButton` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CampaignButton_campaignId_sortOrder_idx`(`campaignId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MissionDay` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `quotaTotal` INTEGER NOT NULL,
    `quotaRemaining` INTEGER NOT NULL,
    `status` ENUM('ACTIVE', 'PAUSED', 'ENDED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MissionDay_date_status_idx`(`date`, `status`),
    INDEX `MissionDay_campaignId_status_idx`(`campaignId`, `status`),
    UNIQUE INDEX `MissionDay_campaignId_date_key`(`campaignId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Participation` (
    `id` VARCHAR(191) NOT NULL,
    `missionDayId` VARCHAR(191) NOT NULL,
    `rewarderId` VARCHAR(191) NOT NULL,
    `status` ENUM('IN_PROGRESS', 'PENDING_REVIEW', 'MANUAL_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELED') NOT NULL DEFAULT 'IN_PROGRESS',
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    `submittedAt` DATETIME(3) NULL,
    `decidedAt` DATETIME(3) NULL,
    `failureReason` VARCHAR(191) NULL,
    `proofText` TEXT NULL,
    `idempotencyKey` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Participation_idempotencyKey_key`(`idempotencyKey`),
    INDEX `Participation_rewarderId_status_idx`(`rewarderId`, `status`),
    INDEX `Participation_missionDayId_status_idx`(`missionDayId`, `status`),
    INDEX `Participation_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VerificationEvidence` (
    `id` VARCHAR(191) NOT NULL,
    `participationId` VARCHAR(191) NOT NULL,
    `type` ENUM('IMAGE', 'VIDEO') NOT NULL,
    `fileRef` TEXT NULL,
    `metadataJson` JSON NULL,
    `ocrText` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `VerificationEvidence_participationId_idx`(`participationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VerificationResult` (
    `id` VARCHAR(191) NOT NULL,
    `participationId` VARCHAR(191) NOT NULL,
    `autoDecision` ENUM('APPROVE', 'REJECT', 'NEED_MANUAL') NULL,
    `manualDecision` ENUM('APPROVE', 'REJECT', 'NEED_MANUAL') NULL,
    `signalsJson` JSON NULL,
    `decidedByAdminId` VARCHAR(191) NULL,
    `decidedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `VerificationResult_participationId_key`(`participationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CreditLedger` (
    `id` VARCHAR(191) NOT NULL,
    `rewarderId` VARCHAR(191) NOT NULL,
    `amountKrw` INTEGER NOT NULL,
    `reason` ENUM('MISSION_REWARD', 'MISSION_APPROVED_CHARGE', 'PAYOUT', 'PAYOUT_REVERSAL', 'TOPUP', 'PRODUCT_ORDER_CREDIT', 'PRODUCT_ORDER_BURN', 'REFUND', 'ADJUSTMENT') NOT NULL,
    `refId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CreditLedger_rewarderId_createdAt_idx`(`rewarderId`, `createdAt`),
    UNIQUE INDEX `CreditLedger_reason_refId_key`(`reason`, `refId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BudgetLedger` (
    `id` VARCHAR(191) NOT NULL,
    `advertiserId` VARCHAR(191) NOT NULL,
    `amountKrw` INTEGER NOT NULL,
    `reason` ENUM('MISSION_REWARD', 'MISSION_APPROVED_CHARGE', 'PAYOUT', 'PAYOUT_REVERSAL', 'TOPUP', 'PRODUCT_ORDER_CREDIT', 'PRODUCT_ORDER_BURN', 'REFUND', 'ADJUSTMENT') NOT NULL,
    `refId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BudgetLedger_advertiserId_createdAt_idx`(`advertiserId`, `createdAt`),
    UNIQUE INDEX `BudgetLedger_reason_refId_key`(`reason`, `refId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PayoutAccount` (
    `id` VARCHAR(191) NOT NULL,
    `rewarderId` VARCHAR(191) NOT NULL,
    `bankName` VARCHAR(191) NOT NULL,
    `accountNumberMasked` VARCHAR(191) NOT NULL,
    `accountHolderName` VARCHAR(191) NULL,
    `isPrimary` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PayoutAccount_rewarderId_isPrimary_idx`(`rewarderId`, `isPrimary`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PayoutRequest` (
    `id` VARCHAR(191) NOT NULL,
    `rewarderId` VARCHAR(191) NOT NULL,
    `payoutAccountId` VARCHAR(191) NOT NULL,
    `amountKrw` INTEGER NOT NULL,
    `status` ENUM('REQUESTED', 'APPROVED', 'REJECTED', 'PAID', 'CANCELED') NOT NULL DEFAULT 'REQUESTED',
    `failureReason` VARCHAR(191) NULL,
    `idempotencyKey` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `decidedAt` DATETIME(3) NULL,

    UNIQUE INDEX `PayoutRequest_idempotencyKey_key`(`idempotencyKey`),
    INDEX `PayoutRequest_rewarderId_status_createdAt_idx`(`rewarderId`, `status`, `createdAt`),
    INDEX `PayoutRequest_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `advertiserId` VARCHAR(191) NOT NULL,
    `amountKrw` INTEGER NOT NULL,
    `status` ENUM('CREATED', 'PAID', 'FAILED', 'CANCELED', 'REFUNDED') NOT NULL DEFAULT 'CREATED',
    `provider` VARCHAR(191) NULL,
    `providerRef` VARCHAR(191) NULL,
    `idempotencyKey` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Payment_providerRef_key`(`providerRef`),
    UNIQUE INDEX `Payment_idempotencyKey_key`(`idempotencyKey`),
    INDEX `Payment_advertiserId_status_createdAt_idx`(`advertiserId`, `status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MissionTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `missionType` ENUM('TRAFFIC', 'SAVE', 'SHARE') NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `payloadJson` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MissionTemplate_missionType_isActive_idx`(`missionType`, `isActive`),
    UNIQUE INDEX `MissionTemplate_key_version_key`(`key`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `missionType` ENUM('TRAFFIC', 'SAVE', 'SHARE') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `marketingCopy` TEXT NULL,
    `guideText` TEXT NULL,
    `unitPriceKrw` INTEGER NOT NULL,
    `vatPercent` INTEGER NOT NULL DEFAULT 0,
    `minOrderDays` INTEGER NOT NULL DEFAULT 7,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `missionTemplateId` VARCHAR(191) NULL,
    `createdByAdminId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Product_isActive_missionType_idx`(`isActive`, `missionType`),
    INDEX `Product_createdByAdminId_createdAt_idx`(`createdByAdminId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductOrder` (
    `id` VARCHAR(191) NOT NULL,
    `advertiserId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `placeId` VARCHAR(191) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `dailyTarget` INTEGER NOT NULL,
    `unitPriceKrw` INTEGER NOT NULL,
    `budgetTotalKrw` INTEGER NOT NULL,
    `vatAmountKrw` INTEGER NOT NULL,
    `totalAmountKrw` INTEGER NOT NULL,
    `status` ENUM('CREATED', 'PAID', 'FULFILLED', 'FAILED', 'CANCELED') NOT NULL DEFAULT 'CREATED',
    `paymentId` VARCHAR(191) NULL,
    `campaignId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ProductOrder_paymentId_key`(`paymentId`),
    UNIQUE INDEX `ProductOrder_campaignId_key`(`campaignId`),
    INDEX `ProductOrder_advertiserId_status_createdAt_idx`(`advertiserId`, `status`, `createdAt`),
    INDEX `ProductOrder_productId_createdAt_idx`(`productId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FraudSignal` (
    `id` VARCHAR(191) NOT NULL,
    `rewarderId` VARCHAR(191) NOT NULL,
    `participationId` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `severity` INTEGER NOT NULL DEFAULT 1,
    `payloadJson` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FraudSignal_rewarderId_createdAt_idx`(`rewarderId`, `createdAt`),
    INDEX `FraudSignal_type_createdAt_idx`(`type`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Blacklist` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Blacklist_type_value_key`(`type`, `value`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Policy` (
    `id` VARCHAR(191) NOT NULL,
    `key` ENUM('PRICING', 'REWARD', 'FRAUD', 'PAYOUT', 'MISSION_LIMITS', 'PRODUCT_ORDER_LIMITS') NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `payloadJson` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Policy_key_isActive_createdAt_idx`(`key`, `isActive`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `channel` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `payloadJson` JSON NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `Notification_type_createdAt_idx`(`type`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VerificationCode` (
    `id` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `VerificationCode_phone_key`(`phone`),
    INDEX `VerificationCode_phone_idx`(`phone`),
    INDEX `VerificationCode_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `actorUserId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `targetType` VARCHAR(191) NULL,
    `targetId` VARCHAR(191) NULL,
    `payloadJson` JSON NULL,
    `ip` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_actorUserId_createdAt_idx`(`actorUserId`, `createdAt`),
    INDEX `AuditLog_action_createdAt_idx`(`action`, `createdAt`),
    INDEX `AuditLog_targetType_targetId_idx`(`targetType`, `targetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdvertiserManager` (
    `id` VARCHAR(191) NOT NULL,
    `advertiserId` VARCHAR(191) NOT NULL,
    `managerId` VARCHAR(191) NOT NULL,
    `assignedBy` VARCHAR(191) NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    INDEX `AdvertiserManager_advertiserId_idx`(`advertiserId`),
    INDEX `AdvertiserManager_managerId_idx`(`managerId`),
    UNIQUE INDEX `AdvertiserManager_advertiserId_managerId_key`(`advertiserId`, `managerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExperienceCampaign` (
    `id` VARCHAR(191) NOT NULL,
    `applicationId` VARCHAR(191) NULL,
    `managerId` VARCHAR(191) NOT NULL,
    `advertiserId` VARCHAR(191) NOT NULL,
    `placeId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `missionGuide` TEXT NULL,
    `benefits` TEXT NULL,
    `targetTeamCount` INTEGER NOT NULL DEFAULT 1,
    `maxMembersPerTeam` INTEGER NOT NULL DEFAULT 5,
    `applicationDeadline` DATETIME(3) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'ENDED') NOT NULL DEFAULT 'DRAFT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ExperienceCampaign_applicationId_idx`(`applicationId`),
    INDEX `ExperienceCampaign_managerId_status_idx`(`managerId`, `status`),
    INDEX `ExperienceCampaign_advertiserId_idx`(`advertiserId`),
    INDEX `ExperienceCampaign_placeId_idx`(`placeId`),
    INDEX `ExperienceCampaign_applicationDeadline_idx`(`applicationDeadline`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Team` (
    `id` VARCHAR(191) NOT NULL,
    `experienceCampaignId` VARCHAR(191) NOT NULL,
    `leaderId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('PENDING_LEADER_APPROVAL', 'FORMING', 'ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'FORMING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Team_experienceCampaignId_idx`(`experienceCampaignId`),
    INDEX `Team_leaderId_idx`(`leaderId`),
    INDEX `Team_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TeamMembership` (
    `id` VARCHAR(191) NOT NULL,
    `teamId` VARCHAR(191) NOT NULL,
    `memberId` VARCHAR(191) NOT NULL,
    `role` ENUM('LEADER', 'MEMBER') NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `appliedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `decidedAt` DATETIME(3) NULL,
    `decidedBy` VARCHAR(191) NULL,
    `failureReason` VARCHAR(191) NULL,
    `invitedByCode` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TeamMembership_teamId_status_idx`(`teamId`, `status`),
    INDEX `TeamMembership_memberId_status_idx`(`memberId`, `status`),
    INDEX `TeamMembership_decidedBy_idx`(`decidedBy`),
    UNIQUE INDEX `TeamMembership_teamId_memberId_key`(`teamId`, `memberId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InvitationCode` (
    `id` VARCHAR(191) NOT NULL,
    `teamId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `maxUses` INTEGER NOT NULL DEFAULT 1,
    `currentUses` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `InvitationCode_code_key`(`code`),
    INDEX `InvitationCode_teamId_idx`(`teamId`),
    INDEX `InvitationCode_code_idx`(`code`),
    INDEX `InvitationCode_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExperiencePricingPlan` (
    `id` VARCHAR(191) NOT NULL,
    `placeType` ENUM('OPENING_SOON', 'OPERATING') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `priceKrw` INTEGER NOT NULL,
    `description` TEXT NULL,
    `teamCount` INTEGER NULL,
    `leaderLevel` VARCHAR(191) NULL,
    `reviewCount` INTEGER NULL,
    `hasRankingBoost` BOOLEAN NOT NULL DEFAULT false,
    `trafficTarget` INTEGER NULL,
    `saveTarget` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ExperiencePricingPlan_placeType_isActive_idx`(`placeType`, `isActive`),
    UNIQUE INDEX `ExperiencePricingPlan_placeType_name_key`(`placeType`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExperienceApplication` (
    `id` VARCHAR(191) NOT NULL,
    `advertiserId` VARCHAR(191) NOT NULL,
    `placeType` ENUM('OPENING_SOON', 'OPERATING') NOT NULL,
    `pricingPlanId` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'BASIC_INFO_COMPLETED', 'PRICING_SELECTED', 'PAYMENT_INFO_COMPLETED', 'PAYMENT_COMPLETED', 'ADDITIONAL_INFO_COMPLETED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `termsAgreed` BOOLEAN NOT NULL DEFAULT false,
    `termsAgreedAt` DATETIME(3) NULL,
    `paymentId` VARCHAR(191) NULL,
    `paymentMethod` VARCHAR(191) NULL,
    `taxInvoiceRequested` BOOLEAN NOT NULL DEFAULT false,
    `taxInvoiceInfo` JSON NULL,
    `businessName` VARCHAR(191) NULL,
    `openingDate` DATETIME(3) NULL,
    `shootingStartDate` DATETIME(3) NULL,
    `currentRanking` VARCHAR(191) NULL,
    `monthlyTeamCapacity` INTEGER NULL,
    `address` VARCHAR(191) NULL,
    `representativeMenu` VARCHAR(191) NULL,
    `localMomBenefit` VARCHAR(191) NULL,
    `contactPhone` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `completedAt` DATETIME(3) NULL,

    INDEX `ExperienceApplication_advertiserId_status_idx`(`advertiserId`, `status`),
    INDEX `ExperienceApplication_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExperienceSubmission` (
    `id` VARCHAR(191) NOT NULL,
    `teamId` VARCHAR(191) NOT NULL,
    `submittedBy` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED') NOT NULL DEFAULT 'DRAFT',
    `materialsPath` VARCHAR(191) NULL,
    `materialsSize` INTEGER NULL,
    `materialsUploadedAt` DATETIME(3) NULL,
    `contentTitle` VARCHAR(191) NULL,
    `contentBody` TEXT NULL,
    `contentLinks` JSON NULL,
    `contentSubmittedAt` DATETIME(3) NULL,
    `reviewedBy` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewComments` TEXT NULL,
    `revisionRequestedAt` DATETIME(3) NULL,
    `revisionComments` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ExperienceSubmission_teamId_idx`(`teamId`),
    INDEX `ExperienceSubmission_submittedBy_idx`(`submittedBy`),
    INDEX `ExperienceSubmission_status_idx`(`status`),
    INDEX `ExperienceSubmission_reviewedBy_idx`(`reviewedBy`),
    UNIQUE INDEX `ExperienceSubmission_teamId_key`(`teamId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExperienceReport` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `generatedBy` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'GENERATED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `title` VARCHAR(191) NOT NULL,
    `summary` TEXT NULL,
    `statistics` JSON NOT NULL,
    `insights` TEXT NULL,
    `recommendations` TEXT NULL,
    `attachments` JSON NULL,
    `reviewedBy` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewComments` TEXT NULL,
    `generatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ExperienceReport_campaignId_idx`(`campaignId`),
    INDEX `ExperienceReport_generatedBy_idx`(`generatedBy`),
    INDEX `ExperienceReport_status_idx`(`status`),
    INDEX `ExperienceReport_reviewedBy_idx`(`reviewedBy`),
    UNIQUE INDEX `ExperienceReport_campaignId_key`(`campaignId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AuthCredential` ADD CONSTRAINT `AuthCredential_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TermsAgreement` ADD CONSTRAINT `TermsAgreement_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdvertiserProfile` ADD CONSTRAINT `AdvertiserProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MemberProfile` ADD CONSTRAINT `MemberProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Place` ADD CONSTRAINT `Place_advertiserId_fkey` FOREIGN KEY (`advertiserId`) REFERENCES `AdvertiserProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Campaign` ADD CONSTRAINT `Campaign_advertiserId_fkey` FOREIGN KEY (`advertiserId`) REFERENCES `AdvertiserProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Campaign` ADD CONSTRAINT `Campaign_placeId_fkey` FOREIGN KEY (`placeId`) REFERENCES `Place`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CampaignButton` ADD CONSTRAINT `CampaignButton_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MissionDay` ADD CONSTRAINT `MissionDay_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Participation` ADD CONSTRAINT `Participation_missionDayId_fkey` FOREIGN KEY (`missionDayId`) REFERENCES `MissionDay`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Participation` ADD CONSTRAINT `Participation_rewarderId_fkey` FOREIGN KEY (`rewarderId`) REFERENCES `MemberProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VerificationEvidence` ADD CONSTRAINT `VerificationEvidence_participationId_fkey` FOREIGN KEY (`participationId`) REFERENCES `Participation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VerificationResult` ADD CONSTRAINT `VerificationResult_participationId_fkey` FOREIGN KEY (`participationId`) REFERENCES `Participation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditLedger` ADD CONSTRAINT `CreditLedger_rewarderId_fkey` FOREIGN KEY (`rewarderId`) REFERENCES `MemberProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BudgetLedger` ADD CONSTRAINT `BudgetLedger_advertiserId_fkey` FOREIGN KEY (`advertiserId`) REFERENCES `AdvertiserProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PayoutAccount` ADD CONSTRAINT `PayoutAccount_rewarderId_fkey` FOREIGN KEY (`rewarderId`) REFERENCES `MemberProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PayoutRequest` ADD CONSTRAINT `PayoutRequest_rewarderId_fkey` FOREIGN KEY (`rewarderId`) REFERENCES `MemberProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PayoutRequest` ADD CONSTRAINT `PayoutRequest_payoutAccountId_fkey` FOREIGN KEY (`payoutAccountId`) REFERENCES `PayoutAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_advertiserId_fkey` FOREIGN KEY (`advertiserId`) REFERENCES `AdvertiserProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_missionTemplateId_fkey` FOREIGN KEY (`missionTemplateId`) REFERENCES `MissionTemplate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_createdByAdminId_fkey` FOREIGN KEY (`createdByAdminId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductOrder` ADD CONSTRAINT `ProductOrder_advertiserId_fkey` FOREIGN KEY (`advertiserId`) REFERENCES `AdvertiserProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductOrder` ADD CONSTRAINT `ProductOrder_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductOrder` ADD CONSTRAINT `ProductOrder_placeId_fkey` FOREIGN KEY (`placeId`) REFERENCES `Place`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductOrder` ADD CONSTRAINT `ProductOrder_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductOrder` ADD CONSTRAINT `ProductOrder_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FraudSignal` ADD CONSTRAINT `FraudSignal_rewarderId_fkey` FOREIGN KEY (`rewarderId`) REFERENCES `MemberProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdvertiserManager` ADD CONSTRAINT `AdvertiserManager_advertiserId_fkey` FOREIGN KEY (`advertiserId`) REFERENCES `AdvertiserProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdvertiserManager` ADD CONSTRAINT `AdvertiserManager_managerId_fkey` FOREIGN KEY (`managerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdvertiserManager` ADD CONSTRAINT `AdvertiserManager_assignedBy_fkey` FOREIGN KEY (`assignedBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExperienceCampaign` ADD CONSTRAINT `ExperienceCampaign_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `ExperienceApplication`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExperienceCampaign` ADD CONSTRAINT `ExperienceCampaign_managerId_fkey` FOREIGN KEY (`managerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExperienceCampaign` ADD CONSTRAINT `ExperienceCampaign_advertiserId_fkey` FOREIGN KEY (`advertiserId`) REFERENCES `AdvertiserProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExperienceCampaign` ADD CONSTRAINT `ExperienceCampaign_placeId_fkey` FOREIGN KEY (`placeId`) REFERENCES `Place`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Team` ADD CONSTRAINT `Team_experienceCampaignId_fkey` FOREIGN KEY (`experienceCampaignId`) REFERENCES `ExperienceCampaign`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Team` ADD CONSTRAINT `Team_leaderId_fkey` FOREIGN KEY (`leaderId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamMembership` ADD CONSTRAINT `TeamMembership_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamMembership` ADD CONSTRAINT `TeamMembership_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamMembership` ADD CONSTRAINT `TeamMembership_decidedBy_fkey` FOREIGN KEY (`decidedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvitationCode` ADD CONSTRAINT `InvitationCode_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvitationCode` ADD CONSTRAINT `InvitationCode_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExperienceApplication` ADD CONSTRAINT `ExperienceApplication_advertiserId_fkey` FOREIGN KEY (`advertiserId`) REFERENCES `AdvertiserProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExperienceApplication` ADD CONSTRAINT `ExperienceApplication_pricingPlanId_fkey` FOREIGN KEY (`pricingPlanId`) REFERENCES `ExperiencePricingPlan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExperienceApplication` ADD CONSTRAINT `ExperienceApplication_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExperienceSubmission` ADD CONSTRAINT `ExperienceSubmission_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExperienceSubmission` ADD CONSTRAINT `ExperienceSubmission_submittedBy_fkey` FOREIGN KEY (`submittedBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExperienceSubmission` ADD CONSTRAINT `ExperienceSubmission_reviewedBy_fkey` FOREIGN KEY (`reviewedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExperienceReport` ADD CONSTRAINT `ExperienceReport_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `ExperienceCampaign`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExperienceReport` ADD CONSTRAINT `ExperienceReport_generatedBy_fkey` FOREIGN KEY (`generatedBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExperienceReport` ADD CONSTRAINT `ExperienceReport_reviewedBy_fkey` FOREIGN KEY (`reviewedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
