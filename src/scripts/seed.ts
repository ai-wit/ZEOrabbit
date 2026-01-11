import "../server/env";

import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../server/auth/password";
import { toDateOnlyUtc } from "../server/date/date-only";
import { maskAccountNumber } from "../server/rewarder/mask";

const prisma = new PrismaClient({ log: ["error", "warn"] });

const DEFAULT_PASSWORD = "password123!";

const ONE_BY_ONE_PNG_DATA_URL =
  // 1x1 transparent png
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=";

type UserRole = "ADVERTISER" | "MEMBER" | "ADMIN";


async function ensureUser(params: { email: string; role: UserRole }): Promise<{ userId: string }> {
  const email = params.email.toLowerCase();
  const existing = await prisma.user.findFirst({ where: { email }, select: { id: true } });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: params.role, status: "ACTIVE", email }
    });
    return { userId: existing.id };
  }

  const passwordHash = await hashPassword(DEFAULT_PASSWORD);

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, role: params.role, status: "ACTIVE" },
      select: { id: true, role: true }
    });

    await tx.authCredential.create({ data: { userId: user.id, passwordHash } });

    if (user.role === "ADVERTISER") {
      await tx.advertiserProfile.create({ data: { userId: user.id } });
      await tx.termsAgreement.createMany({
        data: [
          { userId: user.id, type: "SERVICE", version: "v1" },
          { userId: user.id, type: "PRIVACY", version: "v1" }
        ],
        skipDuplicates: true
      });
    } else if (user.role === "MEMBER") {
      await tx.memberProfile.create({ data: { userId: user.id } });
      await tx.termsAgreement.createMany({
        data: [
          { userId: user.id, type: "SERVICE", version: "v1" },
          { userId: user.id, type: "PRIVACY", version: "v1" },
          { userId: user.id, type: "REWARDER_GUIDE", version: "v1" }
        ],
        skipDuplicates: true
      });
    } else {
      await tx.termsAgreement.createMany({
        data: [
          { userId: user.id, type: "SERVICE", version: "v1" },
          { userId: user.id, type: "PRIVACY", version: "v1" }
        ],
        skipDuplicates: true
      });
    }

    await tx.auditLog.create({
      data: {
        actorUserId: null,
        action: "CLI_SEED_USER",
        targetType: "User",
        targetId: user.id,
        payloadJson: { email, role: user.role }
      }
    });

    return user;
  });

  return { userId: created.id };
}

async function ensurePolicies(): Promise<void> {
  const pricingId = "dev_policy_pricing_1";
  const limitsId = "dev_policy_limits_1";
  const payoutId = "dev_policy_payout_1";

  await prisma.$transaction(async (tx) => {
    await tx.policy.updateMany({ data: { isActive: false } });

    await tx.policy.upsert({
      where: { id: pricingId },
      update: {
        key: "PRICING",
        version: 1,
        isActive: true,
        payloadJson: {
          rewardRatioByMissionType: { TRAFFIC: 0.25, SAVE: 0.3, SHARE: 0.25 },
          unitPriceMinKrwByMissionType: { TRAFFIC: 10, SAVE: 10, SHARE: 10 },
          unitPriceMaxKrwByMissionType: { TRAFFIC: 2000, SAVE: 3000, SHARE: 2500 }
        }
      },
      create: {
        id: pricingId,
        key: "PRICING",
        version: 1,
        isActive: true,
        payloadJson: {
          rewardRatioByMissionType: { TRAFFIC: 0.25, SAVE: 0.3, SHARE: 0.25 },
          unitPriceMinKrwByMissionType: { TRAFFIC: 10, SAVE: 10, SHARE: 10 },
          unitPriceMaxKrwByMissionType: { TRAFFIC: 2000, SAVE: 3000, SHARE: 2500 }
        }
      }
    });

    await tx.policy.upsert({
      where: { id: limitsId },
      update: {
        key: "MISSION_LIMITS",
        version: 1,
        isActive: true,
        payloadJson: {
          timeoutMsByMissionType: {
            TRAFFIC: 10 * 60 * 1000,
            SAVE: 15 * 60 * 1000,
            SHARE: 8 * 60 * 1000
          }
        }
      },
      create: {
        id: limitsId,
        key: "MISSION_LIMITS",
        version: 1,
        isActive: true,
        payloadJson: {
          timeoutMsByMissionType: {
            TRAFFIC: 10 * 60 * 1000,
            SAVE: 15 * 60 * 1000,
            SHARE: 8 * 60 * 1000
          }
        }
      }
    });

    await tx.policy.upsert({
      where: { id: payoutId },
      update: { key: "PAYOUT", version: 1, isActive: true, payloadJson: { minPayoutKrw: 1000 } },
      create: { id: payoutId, key: "PAYOUT", version: 1, isActive: true, payloadJson: { minPayoutKrw: 1000 } }
    });

    await tx.auditLog.create({
      data: { actorUserId: null, action: "CLI_SEED_POLICIES", payloadJson: { pricingId, limitsId, payoutId } }
    });
  });
}

async function ensureAdvertiserBudget(params: { advertiserId: string; providerRef: string; amountKrw: number }) {
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.upsert({
      where: { providerRef: params.providerRef },
      update: {},
      create: {
        advertiserId: params.advertiserId,
        amountKrw: params.amountKrw,
        status: "PAID",
        provider: "DEV",
        providerRef: params.providerRef
      },
      select: { id: true }
    });

    await tx.budgetLedger.createMany({
      data: [{ advertiserId: params.advertiserId, amountKrw: params.amountKrw, reason: "TOPUP", refId: payment.id }],
      skipDuplicates: true
    });
  });
}

async function ensurePrimaryPayoutAccount(rewarderId: string, seedKey: string): Promise<string> {
  const existing = await prisma.payoutAccount.findFirst({ where: { rewarderId, isPrimary: true }, select: { id: true } });
  if (existing) return existing.id;

  const masked = maskAccountNumber(`1234-5678-90${seedKey}-0000`.replaceAll("_", "0"));

  return prisma.$transaction(async (tx) => {
    await tx.payoutAccount.updateMany({ where: { rewarderId }, data: { isPrimary: false } });
    const created = await tx.payoutAccount.create({
      data: { rewarderId, bankName: "국민은행", accountNumberMasked: masked, accountHolderName: "데모", isPrimary: true },
      select: { id: true }
    });
    return created.id;
  });
}

async function ensurePayoutRequest(params: {
  rewarderId: string;
  payoutAccountId: string;
  idempotencyKey: string;
  amountKrw: number;
  status: "REQUESTED" | "APPROVED" | "PAID" | "REJECTED";
  failureReason?: string;
}) {
  const existing = await prisma.payoutRequest.findFirst({ where: { idempotencyKey: params.idempotencyKey }, select: { id: true } });
  if (existing) return existing.id;

  const created = await prisma.payoutRequest.create({
    data: {
      rewarderId: params.rewarderId,
      payoutAccountId: params.payoutAccountId,
      amountKrw: params.amountKrw,
      status: params.status,
      failureReason: params.failureReason ?? null,
      idempotencyKey: params.idempotencyKey
    },
    select: { id: true }
  });
  return created.id;
}

async function ensureParticipationScenario(params: {
  missionDayId: string;
  rewarderId: string;
  idempotencyKey: string;
  status: "IN_PROGRESS" | "PENDING_REVIEW" | "MANUAL_REVIEW" | "APPROVED" | "REJECTED" | "EXPIRED" | "CANCELED";
  failureReason?: string;
  withEvidence: boolean;
  expiresAt: Date;
  submittedAt?: Date;
  decidedAt?: Date;
  creditRewardKrw?: number;
}) {
  const existing = await prisma.participation.findFirst({ where: { idempotencyKey: params.idempotencyKey }, select: { id: true } });
  if (existing) return existing.id;

  const created = await prisma.$transaction(async (tx) => {
    if (params.status !== "CANCELED") {
      await tx.missionDay.updateMany({
        where: { id: params.missionDayId, quotaRemaining: { gt: 0 } },
        data: { quotaRemaining: { decrement: 1 } }
      });
    }

    const p = await tx.participation.create({
      data: {
        missionDayId: params.missionDayId,
        rewarderId: params.rewarderId,
        status: params.status,
        expiresAt: params.expiresAt,
        submittedAt: params.submittedAt ?? null,
        decidedAt: params.decidedAt ?? null,
        failureReason: params.failureReason ?? null,
        idempotencyKey: params.idempotencyKey
      },
      select: { id: true }
    });

    if (params.withEvidence) {
      await tx.verificationEvidence.create({
        data: { participationId: p.id, type: "IMAGE", fileRef: ONE_BY_ONE_PNG_DATA_URL, metadataJson: { seeded: true } }
      });
    }

    if (params.status === "APPROVED") {
      await tx.verificationResult.upsert({
        where: { participationId: p.id },
        update: { manualDecision: "APPROVE", decidedAt: params.decidedAt ?? new Date(), decidedByAdminId: null },
        create: { participationId: p.id, manualDecision: "APPROVE", decidedAt: params.decidedAt ?? new Date(), decidedByAdminId: null }
      });
    }

    if (params.status === "REJECTED") {
      await tx.verificationResult.upsert({
        where: { participationId: p.id },
        update: { manualDecision: "REJECT", decidedAt: params.decidedAt ?? new Date(), decidedByAdminId: null },
        create: { participationId: p.id, manualDecision: "REJECT", decidedAt: params.decidedAt ?? new Date(), decidedByAdminId: null }
      });
    }

    if (params.status === "APPROVED" && params.creditRewardKrw && params.creditRewardKrw > 0) {
      await tx.creditLedger.createMany({
        data: [{ rewarderId: params.rewarderId, amountKrw: params.creditRewardKrw, reason: "MISSION_REWARD", refId: p.id }],
        skipDuplicates: true
      });
    }

    return p.id;
  });

  return created;
}

async function seedAdvertiserInfo(): Promise<void> {
  console.log('광고주 정보 시드 중...');

  // 광고주 1 정보 업데이트
  await prisma.user.update({
    where: { email: "advertiser+1@example.com" },
    data: {
      name: "홍길동",
      phone: "010-1234-5678"
    }
  });

  const advertiser1User = await prisma.user.findUnique({
    where: { email: "advertiser+1@example.com" },
    select: { id: true }
  });

  if (advertiser1User) {
    await prisma.advertiserProfile.update({
      where: { userId: advertiser1User.id },
      data: {
        displayName: "홍길동",
        businessNumber: "123-45-67890"
      }
    });
  }

  // 광고주 2 정보 업데이트
  await prisma.user.update({
    where: { email: "advertiser+2@example.com" },
    data: {
      name: "김철수",
      phone: "010-9876-5432"
    }
  });

  const advertiser2User = await prisma.user.findUnique({
    where: { email: "advertiser+2@example.com" },
    select: { id: true }
  });

  if (advertiser2User) {
    await prisma.advertiserProfile.update({
      where: { userId: advertiser2User.id },
      data: {
        displayName: "김철수",
        businessNumber: "987-65-43210"
      }
    });
  }

  // 광고주 3 정보 업데이트 (존재하는 경우에만)
  const advertiser3Exists = await prisma.user.findUnique({
    where: { email: "advertiser+3@example.com" },
    select: { id: true }
  });

  if (advertiser3Exists) {
    await prisma.user.update({
      where: { email: "advertiser+3@example.com" },
      data: {
        name: "이영희",
        phone: "010-5555-6666"
      }
    });

    await prisma.advertiserProfile.update({
      where: { userId: advertiser3Exists.id },
      data: {
        displayName: "이영희",
        businessNumber: "456-78-90123"
      }
    });
  }

  // 광고주 4 정보 업데이트 (존재하는 경우에만)
  const advertiser4Exists = await prisma.user.findUnique({
    where: { email: "advertiser+4@example.com" },
    select: { id: true }
  });

  if (advertiser4Exists) {
    await prisma.user.update({
      where: { email: "advertiser+4@example.com" },
      data: {
        name: "박민수",
        phone: "010-7777-8888"
      }
    });

    await prisma.advertiserProfile.update({
      where: { userId: advertiser4Exists.id },
      data: {
        displayName: "박민수",
        businessNumber: "321-54-98765"
      }
    });
  }

  // 광고주 5 정보 업데이트 (존재하는 경우에만)
  const advertiser5Exists = await prisma.user.findUnique({
    where: { email: "advertiser+5@example.com" },
    select: { id: true }
  });

  if (advertiser5Exists) {
    await prisma.user.update({
      where: { email: "advertiser+5@example.com" },
      data: {
        name: "정수진",
        phone: "010-9999-0000"
      }
    });

    await prisma.advertiserProfile.update({
      where: { userId: advertiser5Exists.id },
      data: {
        displayName: "정수진",
        businessNumber: "654-32-10987"
      }
    });
  }

  // 광고주 6 정보 업데이트 (존재하는 경우에만)
  const advertiser6Exists = await prisma.user.findUnique({
    where: { email: "advertiser+6@example.com" },
    select: { id: true }
  });

  if (advertiser6Exists) {
    await prisma.user.update({
      where: { email: "advertiser+6@example.com" },
      data: {
        name: "최대현",
        phone: "010-1111-2222"
      }
    });

    await prisma.advertiserProfile.update({
      where: { userId: advertiser6Exists.id },
      data: {
        displayName: "최대현",
        businessNumber: "789-01-23456"
      }
    });
  }

  console.log('광고주 정보 시드 완료.');
}

async function seedExperiencePricingPlans() {
  console.log('체험단 요금제 시드 중...');

  const plans = [
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

  for (const planData of plans) {
    await prisma.experiencePricingPlan.upsert({
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
  console.log('체험단 요금제 시드 완료.');
}

async function seedExperienceApplications(): Promise<void> {
  console.log('체험단 신청 및 결제 데이터 시드 중...');

  // 광고주 프로필 ID들 조회
  const advertiserProfiles = await prisma.advertiserProfile.findMany({
    where: {
      user: {
        email: {
          in: [
            "advertiser+1@example.com",
            "advertiser+2@example.com",
            "advertiser+3@example.com",
            "advertiser+4@example.com",
            "advertiser+5@example.com",
            "advertiser+6@example.com"
          ]
        }
      }
    },
    select: {
      id: true,
      user: { select: { email: true } }
    }
  });

  const applications = [
    // 광고주 1: 홍길동 - 오픈 예정 매장 Basic 요금제 (카드 결제 완료)
    {
      advertiserEmail: "advertiser+1@example.com",
      placeType: 'OPENING_SOON' as const,
      pricingPlanName: 'Basic',
      paymentMethod: 'CARD' as const,
      status: 'PAYMENT_COMPLETED' as const,
      paymentAmount: 290000,
      businessName: '홍카페',
      openingDate: new Date('2025-02-01'),
      shootingStartDate: new Date('2025-01-20'),
      address: '서울시 강남구 역삼동 123-45',
      representativeMenu: '아메리카노, 카페라떼, 크로와상',
      localMomBenefit: '10000',
      contactPhone: '010-1234-5678'
    },
    // 광고주 1: 홍길동 - 운영 중인 매장 Tech 요금제 (카드 결제 완료)
    {
      advertiserEmail: "advertiser+1@example.com",
      placeType: 'OPERATING' as const,
      pricingPlanName: 'Tech',
      paymentMethod: 'CARD' as const,
      status: 'PAYMENT_COMPLETED' as const,
      paymentAmount: 490000,
      businessName: '홍네일아트',
      currentRanking: '순위',
      monthlyTeamCapacity: '15',
      address: '서울시 서초구 서초동 456-78',
      representativeMenu: '젤네일, 페이디큐어',
      contactPhone: '010-1234-5678'
    },
    // 광고주 2: 김철수 - 오픈 예정 매장 Pro 요금제 (무통장 입금 대기)
    {
      advertiserEmail: "advertiser+2@example.com",
      placeType: 'OPENING_SOON' as const,
      pricingPlanName: 'Pro',
      paymentMethod: 'BANK_TRANSFER' as const,
      status: 'PAYMENT_INFO_COMPLETED' as const,
      paymentAmount: 490000,
      businessName: '김분식',
      openingDate: new Date('2025-03-15'),
      shootingStartDate: new Date('2025-03-01'),
      address: '부산시 해운대구 센텀동 789-01',
      representativeMenu: '떡볶이, 튀김, 김밥',
      localMomBenefit: '15000',
      contactPhone: '010-9876-5432'
    },
    // 광고주 2: 김철수 - 운영 중인 매장 Volume 요금제 (카드 결제 완료)
    {
      advertiserEmail: "advertiser+2@example.com",
      placeType: 'OPERATING' as const,
      pricingPlanName: 'Volume',
      paymentMethod: 'CARD' as const,
      status: 'PAYMENT_COMPLETED' as const,
      paymentAmount: 490000,
      businessName: '김치킨',
      currentRanking: '유입',
      monthlyTeamCapacity: '20',
      address: '부산시 남포동 광복로 100-1',
      representativeMenu: '후라이드, 양념치킨',
      contactPhone: '010-9876-5432'
    },
    // 광고주 3: 이영희 - 오픈 예정 매장 VIP 요금제 (카드 결제 완료)
    {
      advertiserEmail: "advertiser+3@example.com",
      placeType: 'OPENING_SOON' as const,
      pricingPlanName: 'VIP',
      paymentMethod: 'CARD' as const,
      status: 'PAYMENT_COMPLETED' as const,
      paymentAmount: 790000,
      businessName: '이영희요가',
      openingDate: new Date('2025-04-01'),
      shootingStartDate: new Date('2025-03-15'),
      address: '서울시 강남구 삼성동 456-78',
      representativeMenu: '요가 클래스, 필라테스',
      localMomBenefit: '20000',
      contactPhone: '010-5555-6666'
    },
    // 광고주 4: 박민수 - 운영 중인 매장 Basic 요금제 (무통장 입금 대기)
    {
      advertiserEmail: "advertiser+4@example.com",
      placeType: 'OPERATING' as const,
      pricingPlanName: 'Basic',
      paymentMethod: 'BANK_TRANSFER' as const,
      status: 'PAYMENT_INFO_COMPLETED' as const,
      paymentAmount: 290000,
      businessName: '박민수분식',
      currentRanking: '리뷰수',
      monthlyTeamCapacity: '8',
      address: '서울시 송파구 잠실동 789-01',
      representativeMenu: '떡볶이, 순대, 튀김',
      contactPhone: '010-7777-8888'
    },
    // 광고주 5: 정수진 - 오픈 예정 매장 Pro 요금제 (카드 결제 완료)
    {
      advertiserEmail: "advertiser+5@example.com",
      placeType: 'OPENING_SOON' as const,
      pricingPlanName: 'Pro',
      paymentMethod: 'CARD' as const,
      status: 'PAYMENT_COMPLETED' as const,
      paymentAmount: 490000,
      businessName: '정수진베이커리',
      openingDate: new Date('2025-05-01'),
      shootingStartDate: new Date('2025-04-15'),
      address: '서울시 마포구 연남동 123-45',
      representativeMenu: '크루아상, 마카롱, 커피',
      localMomBenefit: '15000',
      contactPhone: '010-9999-0000'
    },
    // 광고주 6: 최대현 - 운영 중인 매장 VIP 요금제 (카드 결제 완료)
    {
      advertiserEmail: "advertiser+6@example.com",
      placeType: 'OPERATING' as const,
      pricingPlanName: 'VIP',
      paymentMethod: 'CARD' as const,
      status: 'PAYMENT_COMPLETED' as const,
      paymentAmount: 790000,
      businessName: '최대현카페',
      currentRanking: '순위',
      monthlyTeamCapacity: '25',
      address: '서울시 종로구 익선동 456-78',
      representativeMenu: '디저트, 커피, 브런치',
      contactPhone: '010-1111-2222'
    }
  ];

  for (const appData of applications) {
    // 광고주 프로필 조회
    const advertiserProfile = advertiserProfiles.find(ap => ap.user.email === appData.advertiserEmail);
    if (!advertiserProfile) {
      console.warn(`광고주 프로필을 찾을 수 없음: ${appData.advertiserEmail}`);
      continue;
    }

    // 요금제 조회
    const pricingPlan = await prisma.experiencePricingPlan.findFirst({
      where: {
        placeType: appData.placeType,
        name: appData.pricingPlanName
      }
    });

    if (!pricingPlan) {
      console.warn(`요금제를 찾을 수 없음: ${appData.placeType} - ${appData.pricingPlanName}`);
      continue;
    }

    console.log(`요금제 확인: ${pricingPlan.id}`);

    // 체험단 신청 생성 (트랜잭션 없이 테스트)
    const application = await prisma.experienceApplication.create({
      data: {
        advertiserId: advertiserProfile.id,
        placeType: appData.placeType,
        pricingPlanId: pricingPlan.id,
        status: appData.status,
        termsAgreed: true,
        termsAgreedAt: new Date(),
        paymentMethod: appData.paymentMethod,
        taxInvoiceRequested: false,
        businessName: appData.businessName,
        openingDate: appData.openingDate,
        shootingStartDate: appData.shootingStartDate,
        address: appData.address,
        representativeMenu: appData.representativeMenu,
        localMomBenefit: appData.localMomBenefit,
        contactPhone: appData.contactPhone
      }
    });

    console.log(`체험단 신청 생성됨: ${application.id}`);

    // 결제 레코드 생성
    if (appData.paymentAmount > 0) {
      const paymentId = appData.paymentMethod === 'CARD'
        ? `toss_exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        : `bank_exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const payment = await prisma.payment.create({
        data: {
          id: paymentId,
          advertiserId: advertiserProfile.id,
          amountKrw: appData.paymentAmount,
          status: appData.status === 'PAYMENT_COMPLETED' ? 'PAID' : 'CREATED',
          provider: appData.paymentMethod === 'CARD' ? 'TOSS' : 'BANK_TRANSFER',
          providerRef: paymentId
        }
      });

      // 체험단 신청에 결제 ID 연결
      await prisma.experienceApplication.update({
        where: { id: application.id },
        data: { paymentId: payment.id }
      });

      console.log(`결제 생성됨: ${payment.id}`);

      // 결제 완료된 경우 예산 장부에 추가
      if (appData.status === 'PAYMENT_COMPLETED') {
        // 일시적으로 주석 처리해서 테스트
        await prisma.budgetLedger.create({
          data: {
            advertiserId: advertiserProfile.id,
            amountKrw: appData.paymentAmount,
            reason: 'TOPUP',
            refId: application.id,
            createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
          }
        });

        console.log(`예산 장부 생략 (테스트용)`);
      }
    }
  }

  console.log('체험단 신청 및 결제 데이터 시드 완료.');
}

async function seedAdditionalPayments(): Promise<void> {
  console.log('추가 결제 데이터 시드 중...');

  // 광고주 프로필 ID들 조회
  const advertiserProfiles = await prisma.advertiserProfile.findMany({
    where: {
      user: {
        email: {
          in: [
            "advertiser+1@example.com",
            "advertiser+2@example.com",
            "advertiser+3@example.com",
            "advertiser+4@example.com",
            "advertiser+5@example.com",
            "advertiser+6@example.com"
          ]
        }
      }
    },
    select: {
      id: true,
      user: { select: { email: true } }
    }
  });

  const additionalPayments = [
    // 광고주 1의 추가 충전들
    {
      advertiserId: advertiserProfiles.find(ap => ap.user.email === "advertiser+1@example.com")!.id,
      amount: 50000,
      provider: 'TOSS' as const,
      status: 'PAID' as const,
      createdDaysAgo: 5
    },
    {
      advertiserId: advertiserProfiles.find(ap => ap.user.email === "advertiser+1@example.com")!.id,
      amount: 100000,
      provider: 'BANK_TRANSFER' as const,
      status: 'PAID' as const,
      createdDaysAgo: 12
    },
    {
      advertiserId: advertiserProfiles.find(ap => ap.user.email === "advertiser+1@example.com")!.id,
      amount: 200000,
      provider: 'TOSS' as const,
      status: 'PAID' as const,
      createdDaysAgo: 20
    },

    // 광고주 2의 추가 충전들
    {
      advertiserId: advertiserProfiles.find(ap => ap.user.email === "advertiser+2@example.com")!.id,
      amount: 300000,
      provider: 'TOSS' as const,
      status: 'PAID' as const,
      createdDaysAgo: 3
    },
    {
      advertiserId: advertiserProfiles.find(ap => ap.user.email === "advertiser+2@example.com")!.id,
      amount: 150000,
      provider: 'BANK_TRANSFER' as const,
      status: 'PAID' as const,
      createdDaysAgo: 15
    }
  ];

  for (const paymentData of additionalPayments) {
    const createdAt = new Date(Date.now() - paymentData.createdDaysAgo * 24 * 60 * 60 * 1000);

    const paymentId = paymentData.provider === 'TOSS'
      ? `toss_topup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      : `bank_topup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          id: paymentId,
          advertiserId: paymentData.advertiserId,
          amountKrw: paymentData.amount,
          status: paymentData.status,
          provider: paymentData.provider,
          providerRef: paymentId,
          createdAt: createdAt
        }
      });

      // 예산 장부에 추가
      await tx.budgetLedger.create({
        data: {
          advertiserId: paymentData.advertiserId,
          amountKrw: paymentData.amount,
          reason: 'TOPUP',
          refId: payment.id,
          createdAt: createdAt
        }
      });

      // 감사 로그 추가
      await tx.auditLog.create({
        data: {
          actorUserId: null,
          action: 'PAYMENT_TOPUP_COMPLETED',
          targetType: 'Payment',
          targetId: payment.id,
          payloadJson: {
            amount: paymentData.amount,
            paymentMethod: paymentData.provider === 'TOSS' ? 'CARD' : 'BANK_TRANSFER'
          },
          createdAt: createdAt
        }
      });
    });
  }

  console.log('추가 결제 데이터 시드 완료.');
}

async function run(): Promise<void> {
  await ensurePolicies();

  // Mission Templates
  console.log("🌱 Seeding mission templates...");
  const naverSearchTemplate = await prisma.missionTemplate.upsert({
    where: { key_version: { key: "NAVER_SEARCH_CLICK", version: 1 } },
    update: {},
    create: {
      key: "NAVER_SEARCH_CLICK",
      version: 1,
      missionType: "TRAFFIC",
      name: "네이버 검색 클릭 미션",
      description: "특정 검색어로 네이버 검색 후 클릭하는 미션",
      payloadJson: {
        steps: [
          { type: "SEARCH", keyword: "제품명" },
          { type: "CLICK", target: "플레이스 링크" }
        ]
      },
      isActive: true
    }
  });

  // Products
  console.log("🌱 Seeding products...");
  const trafficProduct = await prisma.product.upsert({
    where: { id: "product-traffic-basic" },
    update: {},
    create: {
      id: "product-traffic-basic",
      missionType: "TRAFFIC",
      name: "트래픽 기본 상품",
      marketingCopy: "100% 리얼 휴먼 트래픽으로 매장 방문 유도",
      guideText: "1. 네이버 검색어 입력\n2. 매장 링크 클릭\n3. 스크린샷 제출",
      unitPriceKrw: 100,
      vatPercent: 10,
      minOrderDays: 7,
      missionTemplateId: naverSearchTemplate.id,
      createdByAdminId: (await ensureUser({ email: "admin+super@example.com", role: "ADMIN" })).userId,
      isActive: true
    }
  });

  console.log("✅ Mission templates and products seeded");

  // 다양한 역할 타입을 테스트하기 위한 사용자들
  const admins = ["admin+super@example.com", "admin+manager@example.com"];
  const advertisers = [
    "advertiser+1@example.com",
    "advertiser+2@example.com",
    "advertiser+3@example.com",
    "advertiser+4@example.com",
    "advertiser+5@example.com",
    "advertiser+6@example.com"
  ];
  const members = [
    "member+normal@example.com",
    "member+team-leader@example.com",
    "member+pro-leader@example.com",
    "member+normal2@example.com",
    "member+normal3@example.com",
    "member+normal4@example.com"
  ];

  await Promise.all([
    ...admins.map((email) => ensureUser({ email, role: "ADMIN" })),
    ...advertisers.map((email) => ensureUser({ email, role: "ADVERTISER" })),
    ...members.map((email, index) => ensureUser({ email, role: "MEMBER" }))
  ]);

  const advertiserProfiles = await prisma.advertiserProfile.findMany({
    where: { user: { email: { in: advertisers.map((e) => e.toLowerCase()) } } },
    select: { id: true, user: { select: { email: true } } }
  });
  const memberProfiles = await prisma.memberProfile.findMany({
    where: { user: { email: { in: members.map((e) => e.toLowerCase()) } } },
    select: { id: true, user: { select: { email: true } } }
  });

  // MEMBER 타입 설정 (다양한 타입)
  await prisma.user.update({
    where: { email: "member+normal@example.com" },
    data: { memberType: "NORMAL" }
  });
  await prisma.user.update({
    where: { email: "member+team-leader@example.com" },
    data: { memberType: "TEAM_LEADER" }
  });
  await prisma.user.update({
    where: { email: "member+pro-leader@example.com" },
    data: { memberType: "TEAM_PRO_LEADER" }
  });
  await prisma.user.update({
    where: { email: "member+normal2@example.com" },
    data: { memberType: "NORMAL" }
  });
  await prisma.user.update({
    where: { email: "member+normal3@example.com" },
    data: { memberType: "NORMAL" }
  });
  await prisma.user.update({
    where: { email: "member+normal4@example.com" },
    data: { memberType: "NORMAL" }
  });

  // ADMIN 타입 설정 (다양한 타입)
  await prisma.user.update({
    where: { email: "admin+super@example.com" },
    data: { adminType: "SUPER" }
  });
  await prisma.user.update({
    where: { email: "admin+manager@example.com" },
    data: { adminType: "MANAGER" }
  });

  await Promise.all(
    advertiserProfiles.map((a, idx) =>
      ensureAdvertiserBudget({ advertiserId: a.id, providerRef: `dev_seed_topup_adv_${idx + 1}`, amountKrw: 300000 })
    )
  );

  const primaryAdv = advertiserProfiles[0];
  if (!primaryAdv) return;

  const placeA =
    (await prisma.place.findFirst({ where: { advertiserId: primaryAdv.id, name: "상도동 막걸리 우이락" }, select: { id: true } })) ??
    (await prisma.place.create({
      data: { advertiserId: primaryAdv.id, name: "상도동 막걸리 우이락", externalProvider: "NAVER_PLACE", externalId: "seed_place_1" },
      select: { id: true }
    }));

  const placeB =
    (await prisma.place.findFirst({ where: { advertiserId: primaryAdv.id, name: "연남동 카페 토끼" }, select: { id: true } })) ??
    (await prisma.place.create({
      data: { advertiserId: primaryAdv.id, name: "연남동 카페 토끼", externalProvider: "NAVER_PLACE", externalId: "seed_place_2" },
      select: { id: true }
    }));

  const today = toDateOnlyUtc(new Date());
  const end = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const activeTraffic =
    (await prisma.campaign.findFirst({
      where: { advertiserId: primaryAdv.id, name: "SEED 트래픽 캠페인 (ACTIVE)" },
      select: { id: true, dailyTarget: true, status: true }
    })) ??
    (await prisma.campaign.create({
      data: {
        advertiserId: primaryAdv.id,
        placeId: placeA.id,
        name: "SEED 트래픽 캠페인 (ACTIVE)",
        missionType: "TRAFFIC",
        dailyTarget: 50,
        startDate: today,
        endDate: end,
        unitPriceKrw: 200,
        rewardKrw: 50,
        budgetTotalKrw: 50 * 8 * 200,
        status: "ACTIVE"
      },
      select: { id: true, dailyTarget: true, status: true }
    }));

  if (activeTraffic.status !== "ACTIVE") {
    await prisma.campaign.update({ where: { id: activeTraffic.id }, data: { status: "ACTIVE" } });
  }

  const activeSave =
    (await prisma.campaign.findFirst({
      where: { advertiserId: primaryAdv.id, name: "SEED 저장 캠페인 (ACTIVE)" },
      select: { id: true, dailyTarget: true, status: true }
    })) ??
    (await prisma.campaign.create({
      data: {
        advertiserId: primaryAdv.id,
        placeId: placeB.id,
        name: "SEED 저장 캠페인 (ACTIVE)",
        missionType: "SAVE",
        dailyTarget: 25,
        startDate: today,
        endDate: end,
        unitPriceKrw: 350,
        rewardKrw: 105,
        budgetTotalKrw: 25 * 8 * 350,
        status: "ACTIVE"
      },
      select: { id: true, dailyTarget: true, status: true }
    }));

  if (activeSave.status !== "ACTIVE") {
    await prisma.campaign.update({ where: { id: activeSave.id }, data: { status: "ACTIVE" } });
  }

  const missionTrafficToday =
    (await prisma.missionDay.findFirst({ where: { campaignId: activeTraffic.id, date: today }, select: { id: true } })) ??
    (await prisma.missionDay.create({
      data: { campaignId: activeTraffic.id, date: today, quotaTotal: activeTraffic.dailyTarget, quotaRemaining: activeTraffic.dailyTarget, status: "ACTIVE" },
      select: { id: true }
    }));

  const missionSaveToday =
    (await prisma.missionDay.findFirst({ where: { campaignId: activeSave.id, date: today }, select: { id: true } })) ??
    (await prisma.missionDay.create({
      data: { campaignId: activeSave.id, date: today, quotaTotal: activeSave.dailyTarget, quotaRemaining: activeSave.dailyTarget, status: "ACTIVE" },
      select: { id: true }
    }));

  const primaryMember = memberProfiles[0];
  if (!primaryMember) return;

  const now = new Date();
  const expiresSoon = new Date(now.getTime() + 7 * 60 * 1000);
  const decidedAt = new Date(now.getTime() - 2 * 60 * 1000);

  await ensureParticipationScenario({
    missionDayId: missionSaveToday.id,
    rewarderId: primaryMember.id,
    idempotencyKey: "seed_pending_review_1",
    status: "PENDING_REVIEW",
    withEvidence: true,
    expiresAt: expiresSoon,
    submittedAt: new Date(now.getTime() - 60 * 1000)
  });

  await ensureParticipationScenario({
    missionDayId: missionTrafficToday.id,
    rewarderId: primaryMember.id,
    idempotencyKey: "seed_approved_1",
    status: "APPROVED",
    withEvidence: true,
    expiresAt: expiresSoon,
    submittedAt: new Date(now.getTime() - 4 * 60 * 1000),
    decidedAt,
    creditRewardKrw: 50
  });

  const payoutAccountId = await ensurePrimaryPayoutAccount(primaryMember.id, "01");
  await ensurePayoutRequest({
    rewarderId: primaryMember.id,
    payoutAccountId,
    idempotencyKey: "seed_payout_requested_1",
    amountKrw: 1000,
    status: "REQUESTED"
  });

  // 리워드 상품 시드
  console.log('리워드 상품 시드 시작...');
  await seedRewardProducts();
  console.log('리워드 상품 시드 완료');

  // 리워드 상품 주문 시드
  console.log('리워드 상품 주문 시드 시작...');
  await seedRewardProductOrders();
  console.log('리워드 상품 주문 시드 완료');

  // 리워드 캠페인 시드
  console.log('리워드 캠페인 시드 시작...');
  await seedRewardCampaigns();
  console.log('리워드 캠페인 시드 완료');

  // 리워드 참여 시드
  console.log('리워드 참여 시드 시작...');
  await seedRewardParticipations();
  console.log('리워드 참여 시드 완료');

  // 체험단 요금제 시드
  console.log('체험단 요금제 시드 시작...');
  await seedExperiencePricingPlans();
  console.log('체험단 요금제 시드 완료');

  // 광고주 정보 시드
  console.log('광고주 정보 시드 시작...');
  await seedAdvertiserInfo();
  console.log('광고주 정보 시드 완료');

  // 체험단 신청 및 결제 데이터 시드
  console.log('체험단 신청 시드 시작...');
  await seedExperienceApplications();
  console.log('체험단 신청 시드 완료');

  // 추가 결제 데이터 시드
  console.log('추가 결제 데이터 시드 시작...');
  await seedAdditionalPayments();
  console.log('추가 결제 데이터 시드 완료');

  // 체험단 전체 워크플로우 시드
  console.log('체험단 워크플로우 시드 시작...');
  await seedExperienceWorkflow();
  console.log('체험단 워크플로우 시드 완료');

  await prisma.auditLog.create({
    data: { actorUserId: null, action: "CLI_SEED_DONE", payloadJson: { at: new Date().toISOString() } }
  });
}

async function seedRewardProducts(): Promise<void> {
  console.log('리워드 상품 시드 중...');

  const superAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN", adminType: "SUPER" },
    select: { id: true }
  });

  if (!superAdmin) {
    console.log('슈퍼 관리자를 찾을 수 없습니다.');
    return;
  }

  const products = [
    // 트래픽 상품들
    {
      id: "product-traffic-basic",
      missionType: "TRAFFIC" as const,
      name: "트래픽 기본 상품",
      marketingCopy: "100% 리얼 휴먼 트래픽으로 매장 방문 유도",
      guideText: "1. 네이버 검색어 입력\n2. 매장 링크 클릭\n3. 스크린샷 제출",
      unitPriceKrw: 100,
      minOrderDays: 7,
    },
    {
      id: "product-traffic-pro",
      missionType: "TRAFFIC" as const,
      name: "트래픽 프로 상품",
      marketingCopy: "프리미엄 트래픽으로 고퀄리티 방문자 유치",
      guideText: "1. 검색어 입력 후 상세 검색\n2. 매장 방문 및 상호작용\n3. 방문 증거 제출",
      unitPriceKrw: 200,
      minOrderDays: 14,
    },
    {
      id: "product-traffic-vip",
      missionType: "TRAFFIC" as const,
      name: "트래픽 VIP 상품",
      marketingCopy: "VIP 등급 트래픽으로 최대 효과 달성",
      guideText: "1. 타겟 지역 내 검색\n2. 매장 방문 및 체류\n3. 상세한 방문 리뷰 제출",
      unitPriceKrw: 350,
      minOrderDays: 21,
    },

    // 저장 상품들
    {
      id: "product-save-basic",
      missionType: "SAVE" as const,
      name: "저장 기본 상품",
      marketingCopy: "네이버 플레이스 저장으로 관심도 상승",
      guideText: "1. 네이버 플레이스 검색\n2. 매장 '저장하기'\n3. 저장 완료 화면 제출",
      unitPriceKrw: 150,
      minOrderDays: 7,
    },
    {
      id: "product-save-pro",
      missionType: "SAVE" as const,
      name: "저장 프로 상품",
      marketingCopy: "프리미엄 저장 활동으로 신뢰도 구축",
      guideText: "1. 플레이스 검색 및 방문\n2. 저장하기 + 찜하기\n3. 상호작용 증거 제출",
      unitPriceKrw: 250,
      minOrderDays: 14,
    },

    // 공유 상품들
    {
      id: "product-share-basic",
      missionType: "SHARE" as const,
      name: "공유 기본 상품",
      marketingCopy: "SNS 공유로 바이럴 효과 창출",
      guideText: "1. 매장 정보 공유하기\n2. 공유 링크 캡처\n3. 공유 증거 제출",
      unitPriceKrw: 200,
      minOrderDays: 10,
    },
    {
      id: "product-share-pro",
      missionType: "SHARE" as const,
      name: "공유 프로 상품",
      marketingCopy: "프리미엄 공유로 최대 노출 효과",
      guideText: "1. 다양한 플랫폼에 공유\n2. 해시태그 활용\n3. 공유 결과 분석 제출",
      unitPriceKrw: 400,
      minOrderDays: 15,
    }
  ];

  for (const productData of products) {
    await prisma.product.upsert({
      where: { id: productData.id },
      update: productData,
      create: {
        ...productData,
        vatPercent: 10,
        createdByAdminId: superAdmin.id,
        isActive: true
      }
    });
  }

  console.log('리워드 상품 시드 완료');
}

async function seedRewardProductOrders(): Promise<void> {
  console.log('리워드 상품 주문 시드 중...');

  const advertisers = await prisma.advertiserProfile.findMany({
    include: { user: true, places: true }
  });

  const products = await prisma.product.findMany();

  if (advertisers.length === 0 || products.length === 0) {
    console.log('광고주 또는 상품이 없습니다.');
    return;
  }

  const orders = [
    // 광고주 1의 주문들
    {
      advertiserId: advertisers[0].id,
      productId: products.find(p => p.id === "product-traffic-basic")!.id,
      placeId: advertisers[0].places[0]?.id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      dailyTarget: 50,
      unitPriceKrw: 100,
      status: "FULFILLED" as const,
      paymentId: "seed_payment_1"
    },
    {
      advertiserId: advertisers[0].id,
      productId: products.find(p => p.id === "product-save-basic")!.id,
      placeId: advertisers[0].places[1]?.id || advertisers[0].places[0]?.id,
      startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
      dailyTarget: 30,
      unitPriceKrw: 150,
      status: "FULFILLED" as const,
      paymentId: "seed_payment_2"
    },

    // 광고주 2의 주문들
    {
      advertiserId: advertisers[1].id,
      productId: products.find(p => p.id === "product-traffic-pro")!.id,
      placeId: advertisers[1].places[0]?.id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      dailyTarget: 75,
      unitPriceKrw: 200,
      status: "FULFILLED" as const,
      paymentId: "seed_payment_3"
    },
    {
      advertiserId: advertisers[1].id,
      productId: products.find(p => p.id === "product-share-basic")!.id,
      placeId: advertisers[1].places[1]?.id || advertisers[1].places[0]?.id,
      startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000),
      dailyTarget: 40,
      unitPriceKrw: 200,
      status: "FULFILLED" as const,
      paymentId: "seed_payment_4"
    }
  ];

  for (const orderData of orders) {
    // 광고주 정보 조회
    const advertiser = await prisma.advertiserProfile.findUnique({
      where: { id: orderData.advertiserId },
      include: { places: true }
    });

    if (!advertiser) {
      console.log(`광고주를 찾을 수 없음: ${orderData.advertiserId}`);
      continue;
    }

    // placeId가 없으면 기본 place 생성 또는 찾기
    let placeId = orderData.placeId;
    if (!placeId && advertiser.places.length > 0) {
      placeId = advertiser.places[0].id;
    } else if (!placeId) {
      // 기본 place 생성
      const newPlace = await prisma.place.create({
        data: {
          advertiserId: orderData.advertiserId,
          name: "기본 매장",
          externalProvider: "NAVER_PLACE",
          externalId: `seed_place_${orderData.advertiserId.slice(-8)}`
        }
      });
      placeId = newPlace.id;
    }

    // 결제 레코드 생성
    const totalDays = Math.ceil((orderData.endDate.getTime() - orderData.startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    const totalAmount = orderData.dailyTarget * totalDays * orderData.unitPriceKrw;

    const payment = await prisma.payment.upsert({
      where: { id: orderData.paymentId },
      update: {},
      create: {
        id: orderData.paymentId,
        advertiserId: orderData.advertiserId,
        amountKrw: totalAmount,
        status: "PAID",
        provider: "DEV",
        providerRef: orderData.paymentId
      }
    });

    // 이미 존재하는지 확인
    const existingOrder = await prisma.productOrder.findUnique({
      where: { paymentId: payment.id }
    });

    if (existingOrder) {
      console.log(`상품 주문 이미 존재: ${existingOrder.id} - ${existingOrder.status}`);
      continue;
    }

    // 상품 주문 생성
    const vatAmount = Math.floor(payment.amountKrw * 0.1); // 10% VAT
    const order = await prisma.productOrder.create({
      data: {
        advertiserId: orderData.advertiserId,
        productId: orderData.productId,
        placeId: placeId,
        startDate: orderData.startDate,
        endDate: orderData.endDate,
        dailyTarget: orderData.dailyTarget,
        unitPriceKrw: orderData.unitPriceKrw,
        budgetTotalKrw: payment.amountKrw,
        vatAmountKrw: vatAmount,
        totalAmountKrw: payment.amountKrw,
        status: orderData.status,
        paymentId: payment.id
      }
    });

    console.log(`상품 주문 생성: ${order.id} - ${orderData.status}`);
  }

  console.log('리워드 상품 주문 시드 완료');
}

async function seedRewardCampaigns(): Promise<void> {
  console.log('리워드 캠페인 시드 중...');

  const managerUser = await prisma.user.findFirst({
    where: { role: "ADMIN", adminType: "MANAGER" },
    select: { id: true }
  });

  if (!managerUser) {
    console.log('매니저 사용자를 찾을 수 없습니다.');
    return;
  }

  // 완료된 상품 주문들을 조회
  const fulfilledOrders = await prisma.productOrder.findMany({
    where: { status: "FULFILLED" },
    include: {
      advertiser: { include: { user: true } },
      place: true,
      product: true
    }
  });

  for (const order of fulfilledOrders) {
    // 이미 캠페인이 있는지 확인 (ProductOrder의 campaignId로 확인)
    const existingCampaign = await prisma.campaign.findFirst({
      where: {
        productOrders: {
          some: { id: order.id }
        }
      }
    });

    if (existingCampaign) {
      console.log(`캠페인 이미 존재: ${existingCampaign.id}`);
      continue;
    }

    // 캠페인 생성
    const campaign = await prisma.campaign.create({
      data: {
        advertiserId: order.advertiserId,
        placeId: order.placeId,
        name: `${order.product.name} - ${order.place.name}`,
        missionType: order.product.missionType,
        missionText: order.product.guideText,
        startDate: order.startDate,
        endDate: order.endDate,
        dailyTarget: order.dailyTarget,
        unitPriceKrw: order.unitPriceKrw,
        rewardKrw: Math.floor(order.unitPriceKrw * 0.25), // 기본 리워드 비율
        budgetTotalKrw: order.totalAmountKrw,
        status: "ACTIVE"
      }
    });

    console.log(`캠페인 생성: ${campaign.name} (${campaign.status})`);

    // ProductOrder에 campaignId 연결
    await prisma.productOrder.update({
      where: { id: order.id },
      data: { campaignId: campaign.id }
    });

    // 캠페인 버튼 추가 (샘플)
    if (campaign.missionType === "TRAFFIC") {
      await prisma.campaignButton.create({
        data: {
          campaignId: campaign.id,
          label: "매장 방문하기",
          url: `https://map.naver.com/p/search/${encodeURIComponent(order.place.name)}`,
          sortOrder: 1
        }
      });
    }

    // MissionDay 생성 (활성 기간 동안)
    const startDate = toDateOnlyUtc(order.startDate);
    const endDate = toDateOnlyUtc(order.endDate);
    const days = [];

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }

    for (const day of days) {
      await prisma.missionDay.create({
        data: {
          campaignId: campaign.id,
          date: day,
          quotaTotal: order.dailyTarget,
          quotaRemaining: day.getTime() >= Date.now() - 24 * 60 * 60 * 1000 ? order.dailyTarget : 0, // 과거는 소진된 것으로
          status: day.getTime() >= Date.now() - 24 * 60 * 60 * 1000 ? "ACTIVE" : "ENDED"
        }
      });
    }

    console.log(`미션 데이 생성: ${days.length}일`);
  }

  console.log('리워드 캠페인 시드 완료');
}

async function seedRewardParticipations(): Promise<void> {
  console.log('리워드 참여 시드 중...');

  const members = await prisma.memberProfile.findMany({
    include: { user: true }
  });

  if (members.length === 0) {
    console.log('멤버가 없습니다.');
    return;
  }

  // 활성 캠페인과 오늘의 미션 데이 조회
  const today = toDateOnlyUtc(new Date());
  const activeMissionDays = await prisma.missionDay.findMany({
    where: {
      date: today,
      status: "ACTIVE",
      quotaRemaining: { gt: 0 },
      campaign: { status: "ACTIVE" }
    },
    include: { campaign: true },
    take: 5 // 테스트용으로 5개만
  });

  if (activeMissionDays.length === 0) {
    console.log('활성 미션 데이가 없습니다.');
    return;
  }

  // 각 미션 데이에 대해 참여 생성
  for (let i = 0; i < Math.min(activeMissionDays.length, members.length); i++) {
    const missionDay = activeMissionDays[i];
    const member = members[i];

    // 이미 참여했는지 확인
    const existing = await prisma.participation.findFirst({
      where: {
        rewarderId: member.id,
        missionDayId: missionDay.id
      }
    });

    if (existing) continue;

    // 참여 상태 결정 (다양한 상태를 위해)
    const statuses = ["IN_PROGRESS", "PENDING_REVIEW", "APPROVED", "REJECTED"] as const;
    const randomStatus = statuses[i % statuses.length];

    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2시간 후 만료
    const submittedAt = randomStatus !== "IN_PROGRESS" ? new Date(Date.now() - Math.random() * 60 * 60 * 1000) : null; // 1시간 내 랜덤
    const decidedAt = (randomStatus === "APPROVED" || randomStatus === "REJECTED") && submittedAt ? new Date(submittedAt.getTime() + Math.random() * 30 * 60 * 1000) : null; // 제출 후 30분 내

    // 참여 생성
    const participation = await prisma.participation.create({
      data: {
        missionDayId: missionDay.id,
        rewarderId: member.id,
        status: randomStatus,
        expiresAt,
        submittedAt,
        decidedAt,
        proofText: randomStatus !== "IN_PROGRESS" ? `${missionDay.campaign.name} 미션에 참여했습니다. 증거를 제출합니다.` : null,
        failureReason: randomStatus === "REJECTED" ? "증거 자료가 불충분합니다." : null
      }
    });

    // 증거 생성 (제출된 경우)
    if (randomStatus !== "IN_PROGRESS") {
      await prisma.verificationEvidence.create({
        data: {
          participationId: participation.id,
          type: "IMAGE",
          fileRef: ONE_BY_ONE_PNG_DATA_URL,
          metadataJson: { seeded: true, status: randomStatus }
        }
      });

      // 승인된 경우 크레딧 지급
      if (randomStatus === "APPROVED") {
        await prisma.creditLedger.create({
          data: {
            rewarderId: member.id,
            amountKrw: missionDay.campaign.rewardKrw,
            reason: "MISSION_REWARD",
            refId: participation.id
          }
        });

        // 검증 결과 기록
        await prisma.verificationResult.upsert({
          where: { participationId: participation.id },
          update: {},
          create: {
            participationId: participation.id,
            manualDecision: "APPROVE",
            decidedAt: decidedAt!,
            decidedByAdminId: null
          }
        });
      }

      // 거절된 경우 검증 결과 기록
      if (randomStatus === "REJECTED") {
        await prisma.verificationResult.upsert({
          where: { participationId: participation.id },
          update: {},
          create: {
            participationId: participation.id,
            manualDecision: "REJECT",
            decidedAt: decidedAt!,
            decidedByAdminId: null
          }
        });
      }
    }

    console.log(`참여 생성: ${participation.id} - ${randomStatus}`);
  }

  console.log('리워드 참여 시드 완료');
}

async function seedExperienceWorkflow(): Promise<void> {
  console.log('체험단 워크플로우 시드 중...');

  // 관리자 조회
  const managerUser = await prisma.user.findFirst({
    where: { role: "ADMIN", adminType: "MANAGER" },
    select: { id: true }
  });

  if (!managerUser) {
    console.log('매니저 사용자를 찾을 수 없습니다. 시드를 건너뜁니다.');
    return;
  }

  // 완료된 체험단 신청 조회
  const completedApplications = await prisma.experienceApplication.findMany({
    where: { status: "COMPLETED" },
    include: {
      advertiser: {
        include: {
          places: true
        }
      },
      pricingPlan: true
    },
    take: 2 // 2개만 테스트용으로 사용
  });

  for (const application of completedApplications) {
    // 체험단 공고 생성
    const campaign = await prisma.experienceCampaign.create({
      data: {
        applicationId: application.id,
        managerId: managerUser.id,
        advertiserId: application.advertiserId,
        placeId: application.advertiser.places[0]?.id || (await prisma.place.findFirst({ select: { id: true } }))!.id,
        title: `${application.businessName} 체험단`,
        description: `${application.businessName}의 체험단 공고입니다.`,
        targetTeamCount: application.pricingPlan.teamCount || 1,
        maxMembersPerTeam: 5,
        applicationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7일 후
        startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14일 후
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30일 후
        status: "ACTIVE"
      }
    });

    console.log(`체험단 공고 생성: ${campaign.title}`);

    // 팀장 사용자들 조회
    const teamLeaders = await prisma.user.findMany({
      where: {
        role: "MEMBER",
        memberType: "TEAM_LEADER"
      },
      take: campaign.targetTeamCount
    });

    // 각 팀장마다 팀 생성
    for (let i = 0; i < Math.min(teamLeaders.length, campaign.targetTeamCount); i++) {
      const leader = teamLeaders[i];

      // 팀 생성 (매니저 승인)
      const team = await prisma.team.create({
        data: {
          experienceCampaignId: campaign.id,
          leaderId: leader.id,
          name: `${leader.name || '팀장'}의 팀 ${i + 1}`,
          description: `체험단을 함께할 팀입니다.`,
          status: i === 0 ? "ACTIVE" : "FORMING" // 첫 번째 팀만 ACTIVE 상태로
        }
      });

      // 팀장 멤버십 생성
      await prisma.teamMembership.create({
        data: {
          teamId: team.id,
          memberId: leader.id,
          role: "LEADER",
          status: "APPROVED",
          decidedAt: new Date(),
          decidedBy: managerUser.id
        }
      });

      console.log(`팀 생성: ${team.name} (팀장: ${leader.name || leader.email})`);

      // 첫 번째 팀에만 팀원 추가 (다른 상태들을 테스트하기 위해)
      if (i === 0) {
        // 일반 멤버들 조회
        const members = await prisma.user.findMany({
          where: {
            role: "MEMBER",
            memberType: "NORMAL"
          },
          take: 3
        });

        // 팀원 멤버십 생성 (2명 승인, 1명 대기)
        for (let j = 0; j < members.length; j++) {
          const member = members[j];
          const status = j < 2 ? "APPROVED" : "PENDING";

          await prisma.teamMembership.create({
            data: {
              teamId: team.id,
              memberId: member.id,
              role: "MEMBER",
              status,
              decidedAt: status === "APPROVED" ? new Date() : undefined,
              decidedBy: status === "APPROVED" ? leader.id : undefined
            }
          });
        }

        // 제출물 생성 (팀이 ACTIVE 상태이므로)
        await prisma.experienceSubmission.create({
          data: {
            teamId: team.id,
            submittedBy: leader.id,
            status: "SUBMITTED",
            materialsPath: `uploads/materials/${team.id}/sample.zip`,
            materialsSize: 1024 * 1024, // 1MB
            contentTitle: "체험단 후기",
            contentBody: `${application.businessName} 체험단에 참여하여 좋은 경험을 했습니다. 음식도 맛있고 서비스도 친절했습니다.`,
            contentLinks: ["https://example.com/review1", "https://example.com/review2"]
          }
        });

        console.log(`제출물 생성: ${team.name}`);
      }
    }

    // 하나의 공고는 종료 상태로 만들어 리포트 테스트
    if (application === completedApplications[0]) {
      await prisma.experienceCampaign.update({
        where: { id: campaign.id },
        data: { status: "ENDED" }
      });

      // 리포트 생성
      const teams = await prisma.team.findMany({
        where: { experienceCampaignId: campaign.id },
        include: {
          memberships: { where: { status: "APPROVED" } },
          submission: true
        }
      });

      const totalTeams = teams.length;
      const activeTeams = teams.filter(team => team.status === "ACTIVE").length;
      const totalMembers = teams.reduce((sum, team) => sum + team.memberships.length, 0);
      const submittedTeams = teams.filter(team => team.submission).length;
      const approvedSubmissions = teams.filter(team =>
        team.submission && team.submission.status === "APPROVED"
      ).length;

      const statistics = {
        totalTeams,
        activeTeams,
        totalMembers,
        submittedTeams,
        approvedSubmissions,
        submissionRate: totalTeams > 0 ? (submittedTeams / totalTeams * 100) : 0,
        approvalRate: submittedTeams > 0 ? (approvedSubmissions / submittedTeams * 100) : 0
      };

      await prisma.experienceReport.create({
        data: {
          campaignId: campaign.id,
          generatedBy: managerUser.id,
          title: `${campaign.title} - 체험단 리포트`,
          statistics,
          summary: `체험단 기간 동안 ${totalTeams}개 팀이 참여하였으며, ${submittedTeams}개 팀이 자료를 제출하였습니다.`,
          insights: `참여율 ${(submittedTeams / totalTeams * 100).toFixed(1)}%, 승인율 ${(approvedSubmissions / submittedTeams * 100).toFixed(1)}%로 체험단이 성공적으로 진행되었습니다.`,
          recommendations: "참여자들의 피드백을 바탕으로 매장 개선에 활용하시기 바랍니다.",
          status: "APPROVED", // 광고주가 확인할 수 있도록 승인 상태로
          reviewedBy: managerUser.id,
          reviewedAt: new Date()
        }
      });

      console.log(`리포트 생성: ${campaign.title}`);
    }
  }

  console.log('체험단 워크플로우 시드 완료');
}

run()
  .then(async () => {
    await prisma.$disconnect();
    process.stdout.write("seed:ok\n");
  })
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });


