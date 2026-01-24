import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { hashPassword } from "@/server/auth/password";
import { toDateOnlyUtc } from "@/server/date/date-only";
import { maskAccountNumber } from "@/server/rewarder/mask";
import { getBaseUrl } from "@/server/url-helpers";

const DEFAULT_PASSWORD = "password123!";

const ONE_BY_ONE_PNG_DATA_URL =
  // 1x1 transparent png
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=";

type UserRole = "ADVERTISER" | "MEMBER" | "ADMIN";

async function ensureUser(params: { email: string; role: UserRole }): Promise<{ userId: string }> {
  const email = params.email.toLowerCase();
  const existing = await prisma.user.findFirst({
    where: { email },
    select: { id: true }
  });

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

    await tx.authCredential.create({
      data: { userId: user.id, passwordHash }
    });

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
        action: "DEV_SEED_USER",
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
      update: {
        key: "PAYOUT",
        version: 1,
        isActive: true,
        payloadJson: { minPayoutKrw: 1000 }
      },
      create: {
        id: payoutId,
        key: "PAYOUT",
        version: 1,
        isActive: true,
        payloadJson: { minPayoutKrw: 1000 }
      }
    });

    await tx.auditLog.create({
      data: {
        actorUserId: null,
        action: "DEV_SEED_POLICIES",
        payloadJson: { pricingId, limitsId, payoutId }
      }
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
      data: [
        {
          advertiserId: params.advertiserId,
          amountKrw: params.amountKrw,
          reason: "TOPUP",
          refId: payment.id
        }
      ],
      skipDuplicates: true
    });
  });
}

async function ensurePrimaryPayoutAccount(rewarderId: string, seedKey: string): Promise<string> {
  const existing = await prisma.payoutAccount.findFirst({
    where: { rewarderId, isPrimary: true },
    select: { id: true }
  });
  if (existing) return existing.id;

  const masked = maskAccountNumber(`1234-5678-90${seedKey}-0000`.replaceAll("_", "0"));

  return prisma.$transaction(async (tx) => {
    await tx.payoutAccount.updateMany({ where: { rewarderId }, data: { isPrimary: false } });
    const created = await tx.payoutAccount.create({
      data: {
        rewarderId,
        bankName: "국민은행",
        accountNumberMasked: masked,
        accountHolderName: "데모",
        isPrimary: true
      },
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
  const existing = await prisma.payoutRequest.findFirst({
    where: { idempotencyKey: params.idempotencyKey },
    select: { id: true }
  });
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
  status:
    | "IN_PROGRESS"
    | "PENDING_REVIEW"
    | "MANUAL_REVIEW"
    | "APPROVED"
    | "REJECTED"
    | "EXPIRED"
    | "CANCELED";
  failureReason?: string;
  withEvidence: boolean;
  expiresAt: Date;
  submittedAt?: Date;
  decidedAt?: Date;
  creditRewardKrw?: number;
}) {
  const existing = await prisma.participation.findFirst({
    where: { idempotencyKey: params.idempotencyKey },
    select: { id: true }
  });
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
        data: {
          participationId: p.id,
              type: "IMAGE",
          fileRef: ONE_BY_ONE_PNG_DATA_URL,
          metadataJson: { seeded: true }
        }
      });
    }

    if (params.status === "APPROVED") {
      await tx.verificationResult.upsert({
        where: { participationId: p.id },
        update: {
          manualDecision: "APPROVE",
          decidedAt: params.decidedAt ?? new Date(),
          decidedByAdminId: null
        },
        create: {
          participationId: p.id,
          manualDecision: "APPROVE",
          decidedAt: params.decidedAt ?? new Date(),
          decidedByAdminId: null
        }
      });
    }

    if (params.status === "REJECTED") {
      await tx.verificationResult.upsert({
        where: { participationId: p.id },
        update: {
          manualDecision: "REJECT",
          decidedAt: params.decidedAt ?? new Date(),
          decidedByAdminId: null
        },
        create: {
          participationId: p.id,
          manualDecision: "REJECT",
          decidedAt: params.decidedAt ?? new Date(),
          decidedByAdminId: null
        }
      });
    }

    if (params.status === "APPROVED" && params.creditRewardKrw && params.creditRewardKrw > 0) {
      await tx.creditLedger.createMany({
        data: [
          {
            rewarderId: params.rewarderId,
            amountKrw: params.creditRewardKrw,
            reason: "MISSION_REWARD",
            refId: p.id
          }
        ],
        skipDuplicates: true
      });
    }

    return p.id;
  });

  return created;
}

export async function POST(req: Request) {

  const baseUrl = getBaseUrl(req);
  
  if (process.env.NODE_ENV === "production") {
    return NextResponse.redirect(new URL("/", baseUrl), 303);
  }

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

  const createdUsers = await Promise.all([
    ...admins.map((email) => ensureUser({ email, role: "ADMIN" })),
    ...advertisers.map((email) => ensureUser({ email, role: "ADVERTISER" })),
    ...rewarders.map((email) => ensureUser({ email, role: "MEMBER" }))
  ]);

  // Resolve profiles.
  const advertiserProfiles = await prisma.advertiserProfile.findMany({
    where: { user: { email: { in: advertisers.map((e) => e.toLowerCase()) } } },
    select: { id: true, user: { select: { email: true } } }
  });
  const rewarderProfiles = await prisma.memberProfile.findMany({
    where: { user: { email: { in: rewarders.map((e) => e.toLowerCase()) } } },
    select: { id: true, user: { select: { email: true } } }
  });

  // Top up budgets for all advertisers.
  await Promise.all(
    advertiserProfiles.map((a, idx) =>
      ensureAdvertiserBudget({
        advertiserId: a.id,
        providerRef: `dev_seed_topup_adv_${idx + 1}`,
        amountKrw: 300000
      })
    )
  );

  // Ensure places + campaigns for the first advertiser (primary demo).
  const primaryAdv = advertiserProfiles[0];
  if (!primaryAdv) return NextResponse.json({ ok: false }, { status: 500 });

  const placeA =
    (await prisma.place.findFirst({
      where: { advertiserId: primaryAdv.id, name: "상도동 막걸리 우이락" },
      select: { id: true }
    })) ??
    (await prisma.place.create({
      data: {
        advertiserId: primaryAdv.id,
        name: "상도동 막걸리 우이락",
        externalProvider: "NAVER_PLACE",
        externalId: "seed_place_1"
      },
      select: { id: true }
    }));

  const placeB =
    (await prisma.place.findFirst({
      where: { advertiserId: primaryAdv.id, name: "연남동 카페 토끼" },
      select: { id: true }
    })) ??
    (await prisma.place.create({
      data: {
        advertiserId: primaryAdv.id,
        name: "연남동 카페 토끼",
        externalProvider: "NAVER_PLACE",
        externalId: "seed_place_2"
      },
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

  const draftSave =
    (await prisma.campaign.findFirst({
      where: { advertiserId: primaryAdv.id, name: "SEED 저장 캠페인 (DRAFT)" },
      select: { id: true }
    })) ??
    (await prisma.campaign.create({
      data: {
        advertiserId: primaryAdv.id,
        placeId: placeB.id,
        name: "SEED 저장 캠페인 (DRAFT)",
        missionType: "SAVE",
        dailyTarget: 10,
        startDate: today,
        endDate: end,
        unitPriceKrw: 400,
        rewardKrw: 120,
        budgetTotalKrw: 10 * 8 * 400,
        status: "DRAFT"
      },
      select: { id: true }
    }));

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

  const activeShare =
    (await prisma.campaign.findFirst({
      where: { advertiserId: primaryAdv.id, name: "SEED 공유 캠페인 (ACTIVE)" },
      select: { id: true, dailyTarget: true, status: true }
    })) ??
    (await prisma.campaign.create({
      data: {
        advertiserId: primaryAdv.id,
        placeId: placeA.id,
        name: "SEED 공유 캠페인 (ACTIVE)",
        missionType: "SHARE",
        dailyTarget: 20,
        startDate: today,
        endDate: end,
        unitPriceKrw: 300,
        rewardKrw: 75,
        budgetTotalKrw: 20 * 8 * 300,
        status: "ACTIVE"
      },
      select: { id: true, dailyTarget: true, status: true }
    }));

  if (activeShare.status !== "ACTIVE") {
    await prisma.campaign.update({ where: { id: activeShare.id }, data: { status: "ACTIVE" } });
  }

  // Today's mission day for active traffic (visible in rewarder missions).
  const missionDayToday = await prisma.missionDay.upsert({
    where: { campaignId_date: { campaignId: activeTraffic.id, date: today } },
    update: { status: "ACTIVE", quotaTotal: 50, quotaRemaining: 50 },
    create: {
      campaignId: activeTraffic.id,
      date: today,
      quotaTotal: 50,
      quotaRemaining: 50,
      status: "ACTIVE"
    },
    select: { id: true }
  });

  const missionDayTodaySave = await prisma.missionDay.upsert({
    where: { campaignId_date: { campaignId: activeSave.id, date: today } },
    update: { status: "ACTIVE", quotaTotal: 25, quotaRemaining: 25 },
    create: {
      campaignId: activeSave.id,
      date: today,
      quotaTotal: 25,
      quotaRemaining: 25,
      status: "ACTIVE"
    },
    select: { id: true }
  });

  const missionDayTodayShare = await prisma.missionDay.upsert({
    where: { campaignId_date: { campaignId: activeShare.id, date: today } },
    update: { status: "ACTIVE", quotaTotal: 20, quotaRemaining: 20 },
    create: {
      campaignId: activeShare.id,
      date: today,
      quotaTotal: 20,
      quotaRemaining: 20,
      status: "ACTIVE"
    },
    select: { id: true }
  });

  // Rewarder scenarios.
  const rewarderByEmail = new Map(rewarderProfiles.map((r) => [r.user.email ?? "", r.id]));
  const r1 = rewarderByEmail.get("rewarder+1@example.com") ?? rewarderProfiles[0]?.id;
  const r2 = rewarderByEmail.get("rewarder+2@example.com") ?? rewarderProfiles[1]?.id;
  const r3 = rewarderByEmail.get("rewarder+3@example.com") ?? rewarderProfiles[2]?.id;
  const r4 = rewarderByEmail.get("rewarder+4@example.com") ?? rewarderProfiles[3]?.id;
  const r5 = rewarderByEmail.get("rewarder+5@example.com") ?? rewarderProfiles[4]?.id;
  const r6 = rewarderByEmail.get("rewarder+6@example.com") ?? rewarderProfiles[5]?.id;

  const now = Date.now();
  const future = new Date(now + 60 * 60 * 1000);
  const past = new Date(now - 60 * 60 * 1000);
  const submitted = new Date(now - 5 * 60 * 1000);
  const decided = new Date(now - 2 * 60 * 1000);

  const created: Record<string, string | null> = {
    participation_in_progress: null,
    participation_pending_review: null,
    participation_manual_review: null,
    participation_approved: null,
    participation_rejected: null,
    payout_requested: null,
    payout_approved: null
  };

  if (r1) {
    created.participation_in_progress = await ensureParticipationScenario({
      missionDayId: missionDayToday.id,
      rewarderId: r1,
      idempotencyKey: "seed_participation_r1_in_progress",
      status: "IN_PROGRESS",
      withEvidence: false,
      expiresAt: future
    });
  }
  if (r2) {
    created.participation_pending_review = await ensureParticipationScenario({
      missionDayId: missionDayToday.id,
      rewarderId: r2,
      idempotencyKey: "seed_participation_r2_pending",
      status: "PENDING_REVIEW",
      withEvidence: true,
      expiresAt: future,
      submittedAt: submitted
    });
  }
  if (r3) {
    created.participation_manual_review = await ensureParticipationScenario({
      missionDayId: missionDayToday.id,
      rewarderId: r3,
      idempotencyKey: "seed_participation_r3_manual",
      status: "MANUAL_REVIEW",
      withEvidence: true,
      expiresAt: future,
      submittedAt: submitted
    });
  }
  if (r4) {
    created.participation_approved = await ensureParticipationScenario({
      missionDayId: missionDayToday.id,
      rewarderId: r4,
      idempotencyKey: "seed_participation_r4_approved",
      status: "APPROVED",
      withEvidence: true,
      expiresAt: future,
      submittedAt: submitted,
      decidedAt: decided,
      creditRewardKrw: 5000
    });
  }
  if (r5) {
    created.participation_rejected = await ensureParticipationScenario({
      missionDayId: missionDayToday.id,
      rewarderId: r5,
      idempotencyKey: "seed_participation_r5_rejected",
      status: "REJECTED",
      withEvidence: true,
      expiresAt: future,
      submittedAt: submitted,
      decidedAt: decided,
      failureReason: "증빙 불충분(시드)"
    });
  }
  if (r6) {
    await ensureParticipationScenario({
      missionDayId: missionDayToday.id,
      rewarderId: r6,
      idempotencyKey: "seed_participation_r6_expired",
      status: "EXPIRED",
      withEvidence: false,
      expiresAt: past
    });
  }

  // Ensure payout requests for admin payout flow.
  if (r4) {
    const payoutAccountId = await ensurePrimaryPayoutAccount(r4, "04");
    created.payout_requested = await ensurePayoutRequest({
      rewarderId: r4,
      payoutAccountId,
      idempotencyKey: "seed_payout_r4_requested",
      amountKrw: 5000,
      status: "REQUESTED"
    });
  }
  if (r5) {
    const payoutAccountId = await ensurePrimaryPayoutAccount(r5, "05");
    created.payout_approved = await ensurePayoutRequest({
      rewarderId: r5,
      payoutAccountId,
      idempotencyKey: "seed_payout_r5_approved",
      amountKrw: 7000,
      status: "APPROVED"
    });
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: null,
      action: "DEV_SEED_DONE",
      payloadJson: {
        users: { admins, advertisers, rewarders },
        advertiserPrimary: primaryAdv.user.email,
        campaignIds: {
          activeTraffic: activeTraffic.id,
          activeSave: activeSave.id,
          activeShare: activeShare.id,
          draftSave: draftSave.id
        },
        missionDaysToday: {
          traffic: missionDayToday.id,
          save: missionDayTodaySave.id,
          share: missionDayTodayShare.id
        },
        created
      }
    }
  });

  return NextResponse.json({
    ok: true,
    password: DEFAULT_PASSWORD,
    accounts: {
      admins,
      advertisers,
      rewarders
    },
    primaryDemo: {
      advertiserEmail: primaryAdv.user.email,
      activeTrafficCampaignId: activeTraffic.id,
      missionDayTodayId: missionDayToday.id,
      activeSaveCampaignId: activeSave.id,
      activeShareCampaignId: activeShare.id
    },
    created
  });
}


