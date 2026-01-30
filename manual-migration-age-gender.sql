-- Manual migration: Add age and gender to MemberProfile
-- Date: 2026-01-30
-- IMPORTANT: Backup database before running this migration!

-- Add age column (nullable, so existing data is safe)
ALTER TABLE `MemberProfile` 
ADD COLUMN `age` INT NULL 
COMMENT '연령';

-- Add gender column (nullable, so existing data is safe)
ALTER TABLE `MemberProfile` 
ADD COLUMN `gender` VARCHAR(20) NULL 
COMMENT '성별: MALE, FEMALE, OTHER';

-- Verify the changes
SELECT COUNT(*) as total_members FROM `MemberProfile`;
DESCRIBE `MemberProfile`;

