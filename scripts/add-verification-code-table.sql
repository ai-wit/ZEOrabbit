-- Add VerificationCode table for phone verification
-- Run this SQL on your MySQL database after schema update

CREATE TABLE `VerificationCode` (
  `id` VARCHAR(25) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `code` VARCHAR(6) NOT NULL,
  `expiresAt` DATETIME NOT NULL,
  `attempts` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `VerificationCode_phone_key` (`phone`),
  KEY `VerificationCode_phone_idx` (`phone`),
  KEY `VerificationCode_expiresAt_idx` (`expiresAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
