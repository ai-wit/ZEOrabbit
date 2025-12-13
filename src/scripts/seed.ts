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

type UserRole = "ADVERTISER" | "REWARDER" | "ADMIN";

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
    } else if (user.role === "REWARDER") {
      await tx.rewarderProfile.create({ data: { userId: user.id } });
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

async function run(): Promise<void> {
  await ensurePolicies();

  const admins = ["admin+1@example.com", "admin+2@example.com"];
  const advertisers = ["advertiser+1@example.com", "advertiser+2@example.com"];
  const rewarders = [
    "rewarder+1@example.com",
    "rewarder+2@example.com",
    "rewarder+3@example.com",
    "rewarder+4@example.com",
    "rewarder+5@example.com",
    "rewarder+6@example.com"
  ];

  await Promise.all([
    ...admins.map((email) => ensureUser({ email, role: "ADMIN" })),
    ...advertisers.map((email) => ensureUser({ email, role: "ADVERTISER" })),
    ...rewarders.map((email) => ensureUser({ email, role: "REWARDER" }))
  ]);

  const advertiserProfiles = await prisma.advertiserProfile.findMany({
    where: { user: { email: { in: advertisers.map((e) => e.toLowerCase()) } } },
    select: { id: true, user: { select: { email: true } } }
  });
  const rewarderProfiles = await prisma.rewarderProfile.findMany({
    where: { user: { email: { in: rewarders.map((e) => e.toLowerCase()) } } },
    select: { id: true, user: { select: { email: true } } }
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

  const primaryRw = rewarderProfiles[0];
  if (!primaryRw) return;

  const now = new Date();
  const expiresSoon = new Date(now.getTime() + 7 * 60 * 1000);
  const decidedAt = new Date(now.getTime() - 2 * 60 * 1000);

  await ensureParticipationScenario({
    missionDayId: missionSaveToday.id,
    rewarderId: primaryRw.id,
    idempotencyKey: "seed_pending_review_1",
    status: "PENDING_REVIEW",
    withEvidence: true,
    expiresAt: expiresSoon,
    submittedAt: new Date(now.getTime() - 60 * 1000)
  });

  await ensureParticipationScenario({
    missionDayId: missionTrafficToday.id,
    rewarderId: primaryRw.id,
    idempotencyKey: "seed_approved_1",
    status: "APPROVED",
    withEvidence: true,
    expiresAt: expiresSoon,
    submittedAt: new Date(now.getTime() - 4 * 60 * 1000),
    decidedAt,
    creditRewardKrw: 50
  });

  const payoutAccountId = await ensurePrimaryPayoutAccount(primaryRw.id, "01");
  await ensurePayoutRequest({
    rewarderId: primaryRw.id,
    payoutAccountId,
    idempotencyKey: "seed_payout_requested_1",
    amountKrw: 1000,
    status: "REQUESTED"
  });

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


