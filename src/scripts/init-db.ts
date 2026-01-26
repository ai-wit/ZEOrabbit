import "../server/env";

import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../server/auth/password";

const prisma = new PrismaClient({ log: ["error", "warn"] });

const DEFAULT_SUPER_ADMIN_PASSWORD = "SuperAdmin123!";

type UserRole = "ADVERTISER" | "MEMBER" | "ADMIN";
type AdminType = "SUPER" | "MANAGER";

/**
 * 프로덕션 환경용 데이터베이스 초기화 스크립트
 * 시스템 운영에 필수적인 기본 데이터만 배포합니다.
 *
 * 실행 방법:
 * npm run init-db
 * 또는
 * npx tsx src/scripts/init-db.ts
 */
async function ensureEssentialPolicies(): Promise<void> {
  console.log('🔧 시스템 정책 데이터 초기화 중...');

  const policies = [
    {
      id: "policy_pricing_v1",
      key: "PRICING" as const,
      version: 1,
      payloadJson: {
        rewardRatioByMissionType: { TRAFFIC: 0.25, SAVE: 0.3, SHARE: 0.25 },
        unitPriceMinKrwByMissionType: { TRAFFIC: 10, SAVE: 10, SHARE: 10 },
        unitPriceMaxKrwByMissionType: { TRAFFIC: 2000, SAVE: 3000, SHARE: 2500 }
      }
    },
    {
      id: "policy_limits_v1",
      key: "MISSION_LIMITS" as const,
      version: 1,
      payloadJson: {
        timeoutMsByMissionType: {
          TRAFFIC: 10 * 60 * 1000,
          SAVE: 15 * 60 * 1000,
          SHARE: 8 * 60 * 1000
        }
      }
    },
    {
      id: "policy_product_order_limits_v1",
      key: "PRODUCT_ORDER_LIMITS" as const,
      version: 1,
      payloadJson: {
        maxAdditionalDays: 30,
        maxDailyTarget: 1000
      }
    },
    {
      id: "policy_payout_v1",
      key: "PAYOUT" as const,
      version: 1,
      payloadJson: { minPayoutKrw: 1000 }
    },
    {
      id: "policy_fraud_v1",
      key: "FRAUD" as const,
      version: 1,
      payloadJson: {
        maxDailyParticipations: 5,
        maxConcurrentParticipations: 2,
        suspiciousPatterns: ["fast_completion", "duplicate_images"]
      }
    }
  ];

  await prisma.$transaction(async (tx) => {
    // 기존 정책들을 비활성화
    await tx.policy.updateMany({ data: { isActive: false } });

    // 필수 정책들을 upsert
    for (const policy of policies) {
      await tx.policy.upsert({
        where: { id: policy.id },
        update: {
          key: policy.key,
          version: policy.version,
          isActive: true,
          payloadJson: policy.payloadJson
        },
        create: {
          id: policy.id,
          key: policy.key,
          version: policy.version,
          isActive: true,
          payloadJson: policy.payloadJson
        }
      });
    }

    await tx.auditLog.create({
      data: {
        actorUserId: null,
        action: "INIT_ESSENTIAL_POLICIES",
        payloadJson: { policiesCount: policies.length }
      }
    });
  });

  console.log('✅ 시스템 정책 데이터 초기화 완료');
}

async function ensureSuperAdmin(): Promise<void> {
  console.log('👑 슈퍼 관리자 계정 초기화 중...');

  const superAdminEmail = "superadmin@zeorabbit.com";
  const existing = await prisma.user.findFirst({
    where: { email: superAdminEmail },
    select: { id: true, status: true }
  });

  if (existing) {
    if (existing.status !== "ACTIVE") {
      await prisma.user.update({
        where: { id: existing.id },
        data: { status: "ACTIVE" }
      });
    }
    console.log('ℹ️  슈퍼 관리자 계정이 이미 존재합니다.');
    return;
  }

  const passwordHash = await hashPassword(DEFAULT_SUPER_ADMIN_PASSWORD);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: superAdminEmail,
        role: "ADMIN",
        adminType: "SUPER",
        status: "ACTIVE",
        name: "시스템 관리자"
      },
      select: { id: true }
    });

    await tx.authCredential.create({
      data: { userId: user.id, passwordHash }
    });

    // 약관 동의 생성
    await tx.termsAgreement.createMany({
      data: [
        { userId: user.id, type: "SERVICE", version: "v1" },
        { userId: user.id, type: "PRIVACY", version: "v1" }
      ],
      skipDuplicates: true
    });

    await tx.auditLog.create({
      data: {
        actorUserId: null,
        action: "INIT_SUPER_ADMIN",
        targetType: "User",
        targetId: user.id,
        payloadJson: { email: superAdminEmail, role: "ADMIN", adminType: "SUPER" }
      }
    });
  });

  console.log('✅ 슈퍼 관리자 계정 생성 완료');
  console.log(`📧 이메일: ${superAdminEmail}`);
  console.log(`🔑 초기 비밀번호: ${DEFAULT_SUPER_ADMIN_PASSWORD}`);
  console.log('⚠️  로그인 후 즉시 비밀번호를 변경해주세요.');
}

async function ensureExperiencePricingPlans(): Promise<void> {
  console.log('💰 체험단 요금제 데이터 초기화 중...');

  const pricingPlans = [
    // 오픈 예정 매장 요금제
    {
      placeType: 'OPENING_SOON' as const,
      name: 'Basic',
      displayName: 'Basic 29만원',
      priceKrw: 290000,
      description: '오픈 준비 팩 - 리뷰 0개인 민망한 상태만 피하자. (사진/기본리뷰 확보)',
      teamCount: 1,
      leaderLevel: 'Lv1',
      reviewCount: 25,
      hasRankingBoost: false,
      trafficTarget: 3000,
      saveTarget: 100,
    },
    {
      placeType: 'OPENING_SOON' as const,
      name: 'Pro',
      displayName: 'Pro 49만원',
      priceKrw: 490000,
      description: '그랜드 오픈 팩 - 오픈 첫 주에 리뷰 50개 깔아서 기선 제압하자.',
      teamCount: 1,
      leaderLevel: 'Lv1',
      reviewCount: 50,
      hasRankingBoost: true,
      trafficTarget: 3000,
      saveTarget: 100,
    },
    {
      placeType: 'OPENING_SOON' as const,
      name: 'VIP',
      displayName: 'VIP 79만원',
      priceKrw: 790000,
      description: '런칭 컨설팅 팩 - 첫 단추부터 전문가가 끼워준다. SEO/키워드 완벽 세팅.',
      teamCount: 1,
      leaderLevel: 'Lv2',
      reviewCount: 50,
      hasRankingBoost: true,
      trafficTarget: 5000,
      saveTarget: 300,
    },
    // 운영 중인 매장 요금제
    {
      placeType: 'OPERATING' as const,
      name: 'Basic',
      displayName: '① 29만원 (실속형)',
      priceKrw: 290000,
      description: '자료 수집 & 기본 리뷰',
      teamCount: 1,
      leaderLevel: 'Lv1',
      reviewCount: 25,
      hasRankingBoost: false,
      trafficTarget: 3000,
      saveTarget: 100,
    },
    {
      placeType: 'OPERATING' as const,
      name: 'Tech',
      displayName: '② 49만원 A (기술형)',
      priceKrw: 490000,
      description: '리뷰 + 순위 부스팅',
      teamCount: 1,
      leaderLevel: 'Lv1',
      reviewCount: 25,
      hasRankingBoost: true,
      trafficTarget: 3000,
      saveTarget: 100,
    },
    {
      placeType: 'OPERATING' as const,
      name: 'Volume',
      displayName: '③ 49만원 B (물량형)',
      priceKrw: 490000,
      description: '리뷰 폭격 (물량 2배) - 도배 효과',
      teamCount: 2,
      leaderLevel: 'Lv1',
      reviewCount: 50,
      hasRankingBoost: false,
      trafficTarget: 3000,
      saveTarget: 100,
    },
    {
      placeType: 'OPERATING' as const,
      name: 'VIP',
      displayName: '④ 79만원 (VIP형)',
      priceKrw: 790000,
      description: '지역 1등 만들기 (Total) - 고퀄리티 보장',
      teamCount: 2,
      leaderLevel: 'Lv2',
      reviewCount: 50,
      hasRankingBoost: true,
      trafficTarget: 5000,
      saveTarget: 300,
    },
  ];

  await prisma.$transaction(async (tx) => {
    for (const planData of pricingPlans) {
      await tx.experiencePricingPlan.upsert({
        where: {
          placeType_name: {
            placeType: planData.placeType,
            name: planData.name,
          },
        },
        update: planData,
        create: planData,
      });
    }

    await tx.auditLog.create({
      data: {
        actorUserId: null,
        action: "INIT_PRICING_PLANS",
        payloadJson: { plansCount: pricingPlans.length }
      }
    });
  });

  console.log('✅ 체험단 요금제 데이터 초기화 완료');
}

async function ensureSecuritySettings(): Promise<void> {
  console.log('🔒 기본 보안 설정 초기화 중...');

  // 기본 블랙리스트 항목들 (필요에 따라 조정)
  const blacklistEntries = [
    {
      type: "IP" as const,
      value: "127.0.0.1",
      reason: "localhost - 개발용",
      active: false // 프로덕션에서는 true로 변경 필요
    }
  ];

  await prisma.$transaction(async (tx) => {
    for (const entry of blacklistEntries) {
      await tx.blacklist.upsert({
        where: { type_value: { type: entry.type, value: entry.value } },
        update: entry,
        create: entry
      });
    }

    await tx.auditLog.create({
      data: {
        actorUserId: null,
        action: "INIT_SECURITY_SETTINGS",
        payloadJson: { blacklistCount: blacklistEntries.length }
      }
    });
  });

  console.log('✅ 기본 보안 설정 초기화 완료');
}

async function run(): Promise<void> {
  console.log('🚀 ZEOrabbit 프로덕션 데이터베이스 초기화 시작...\n');

  try {
    // 1. 시스템 정책 데이터 초기화
    await ensureEssentialPolicies();

    // 2. 슈퍼 관리자 계정 생성
    await ensureSuperAdmin();

    // 3. 체험단 요금제 데이터 초기화
    await ensureExperiencePricingPlans();

    // 4. 기본 보안 설정 초기화
    await ensureSecuritySettings();

    // 최종 감사 로그
    await prisma.auditLog.create({
      data: {
        actorUserId: null,
        action: "INIT_DB_COMPLETED",
        payloadJson: {
          completedAt: new Date().toISOString(),
          environment: process.env.NODE_ENV || "production"
        }
      }
    });

    console.log('\n🎉 ZEOrabbit 데이터베이스 초기화가 완료되었습니다!');
    console.log('시스템을 시작할 준비가 되었습니다.');

  } catch (error) {
    console.error('❌ 데이터베이스 초기화 중 오류 발생:', error);
    throw error;
  }
}

// 스크립트 실행
run()
  .then(async () => {
    await prisma.$disconnect();
    console.log('✅ 데이터베이스 초기화가 성공적으로 완료되었습니다.');
    process.stdout.write("init-db:ok\n");
  })
  .catch(async (e) => {
    console.error('❌ 데이터베이스 초기화 실패:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
