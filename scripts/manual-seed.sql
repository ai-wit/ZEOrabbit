-- Manual seed data for testing
-- Run this SQL after DB reset to create basic test accounts

-- Hash for password "password123!" (bcrypt)
-- In production, use proper password hashing
SET @password_hash = '$2b$10$abcdefghijklmnopqrstuvwx.yzABCDEFGHIJKLMNOPQRSTUVWXYZ12';

-- Create test users
INSERT INTO User (id, email, name, role, status, createdAt, updatedAt) VALUES
('user_admin', 'admin@example.com', '관리자', 'ADMIN', 'ACTIVE', NOW(), NOW()),
('user_advertiser', 'advertiser@example.com', '광고주', 'ADVERTISER', 'ACTIVE', NOW(), NOW()),
('user_member', 'member@example.com', '회원', 'MEMBER', 'ACTIVE', NOW(), NOW());

-- Create auth credentials
INSERT INTO AuthCredential (id, userId, passwordHash, createdAt, updatedAt) VALUES
('cred_admin', 'user_admin', @password_hash, NOW(), NOW()),
('cred_advertiser', 'user_advertiser', @password_hash, NOW(), NOW()),
('cred_member', 'user_member', @password_hash, NOW(), NOW());

-- Create profiles
INSERT INTO AdvertiserProfile (id, userId, displayName, createdAt, updatedAt) VALUES
('profile_advertiser', 'user_advertiser', '테스트 광고주', NOW(), NOW());

INSERT INTO MemberProfile (id, userId, level, trustScore, warningCount, createdAt, updatedAt) VALUES
('profile_member', 'user_member', 1, 100, 0, NOW(), NOW());

-- Create terms agreements
INSERT INTO TermsAgreement (id, userId, type, version, acceptedAt) VALUES
('terms_admin_service', 'user_admin', 'SERVICE', 'v1', NOW()),
('terms_admin_privacy', 'user_admin', 'PRIVACY', 'v1', NOW()),
('terms_advertiser_service', 'user_advertiser', 'SERVICE', 'v1', NOW()),
('terms_advertiser_privacy', 'user_advertiser', 'PRIVACY', 'v1', NOW()),
('terms_member_service', 'user_member', 'SERVICE', 'v1', NOW()),
('terms_member_privacy', 'user_member', 'PRIVACY', 'v1', NOW()),
('terms_member_guide', 'user_member', 'REWARDER_GUIDE', 'v1', NOW());

-- Create basic policies
INSERT INTO Policy (id, key, version, payloadJson, isActive, createdAt) VALUES
('policy_pricing', 'PRICING', 1, '{"rewardRatioByMissionType":{"TRAFFIC":0.25,"SAVE":0.3,"SHARE":0.25},"unitPriceMinKrwByMissionType":{"TRAFFIC":10,"SAVE":10,"SHARE":10},"unitPriceMaxKrwByMissionType":{"TRAFFIC":2000,"SAVE":3000,"SHARE":2500}}', 1, NOW()),
('policy_limits', 'MISSION_LIMITS', 1, '{"timeoutMsByMissionType":{"TRAFFIC":600000,"SAVE":900000,"SHARE":480000}}', 1, NOW()),
('policy_payout', 'PAYOUT', 1, '{"minPayoutKrw":1000}', 1, NOW());
