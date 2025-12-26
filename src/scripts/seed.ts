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
        data: { participationId: p.id, type: "SCREENSHOT", fileRef: ONE_BY_ONE_PNG_DATA_URL, metadataJson: { seeded: true } }
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

async function run(): Promise<void> {
  await ensurePolicies();

  // 다양한 역할 타입을 테스트하기 위한 사용자들
  const admins = ["admin+super@example.com", "admin+manager@example.com"];
  const advertisers = ["advertiser+1@example.com", "advertiser+2@example.com"];
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

  // 체험단 요금제 시드
  await seedExperiencePricingPlans();

  // 광고주 정보 시드
  await seedAdvertiserInfo();

  await prisma.auditLog.create({
    data: { actorUserId: null, action: "CLI_SEED_DONE", payloadJson: { at: new Date().toISOString() } }
  });
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


