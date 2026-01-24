import crypto from "crypto";
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

async function ensureUser(params: {
  email: string;
  role: "ADVERTISER" | "MEMBER" | "ADMIN";
}): Promise<{ userId: string }> {
  const email = params.email.toLowerCase();
  const existing = await prisma.user.findFirst({
    where: { email },
    select: { id: true }
  });
  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { role: params.role } });
    return { userId: existing.id };
  }

  const passwordHash = await hashPassword(DEFAULT_PASSWORD);

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, role: params.role },
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
        ]
      });
    } else if (user.role === "MEMBER") {
      await tx.memberProfile.create({ data: { userId: user.id } });
      await tx.termsAgreement.createMany({
        data: [
          { userId: user.id, type: "SERVICE", version: "v1" },
          { userId: user.id, type: "PRIVACY", version: "v1" },
          { userId: user.id, type: "REWARDER_GUIDE", version: "v1" }
        ]
      });
    } else {
      await tx.termsAgreement.createMany({
        data: [
          { userId: user.id, type: "SERVICE", version: "v1" },
          { userId: user.id, type: "PRIVACY", version: "v1" }
        ]
      });
    }

    await tx.auditLog.create({
      data: {
        actorUserId: null,
        action: "DEV_BOOTSTRAP_USER",
        targetType: "User",
        targetId: user.id
      }
    });

    return user;
  });

  return { userId: created.id };
}

async function ensurePolicies(): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.policy.updateMany({ data: { isActive: false } });

    await tx.policy.create({
      data: {
        key: "PRICING",
        version: 1,
        isActive: true,
        payloadJson: {
          rewardRatioByMissionType: { TRAFFIC: 0.25, SAVE: 0.3, SHARE: 0.25 },
          unitPriceMinKrwByMissionType: { TRAFFIC: 1, SAVE: 1, SHARE: 1 },
          unitPriceMaxKrwByMissionType: { TRAFFIC: 1000, SAVE: 1000, SHARE: 1000 }
        }
      }
    });

    await tx.policy.create({
      data: {
        key: "MISSION_LIMITS",
        version: 1,
        isActive: true,
        payloadJson: {
          timeoutMsByMissionType: {
            TRAFFIC: 3 * 60 * 1000,
            SAVE: 5 * 60 * 1000,
            SHARE: 2 * 60 * 1000
          }
        }
      }
    });

    await tx.policy.create({
      data: {
        key: "PAYOUT",
        version: 1,
        isActive: true,
        payloadJson: {
          minPayoutKrw: 1000
        }
      }
    });

    await tx.auditLog.create({ data: { actorUserId: null, action: "DEV_BOOTSTRAP_POLICIES" } });
  });
}

export async function POST(req: Request) {

  const baseUrl = getBaseUrl(req);
  
  if (process.env.NODE_ENV === "production") {
    return NextResponse.redirect(new URL("/", baseUrl), 303);
  }

  await ensurePolicies();

  const advertiserEmail = "advertiser@example.com";
  const memberEmail = "member@example.com";
  const adminEmail = "admin@example.com";

  const [{ userId: advertiserUserId }, { userId: memberUserId }, { userId: adminUserId }] =
    await Promise.all([
      ensureUser({ email: advertiserEmail, role: "ADVERTISER" }),
      ensureUser({ email: memberEmail, role: "MEMBER" }),
      ensureUser({ email: adminEmail, role: "ADMIN" })
    ]);

  const advertiserProfile = await prisma.advertiserProfile.findUnique({
    where: { userId: advertiserUserId },
    select: { id: true }
  });
  const memberProfile = await prisma.memberProfile.findUnique({
    where: { userId: memberUserId },
    select: { id: true }
  });
  if (!advertiserProfile || !memberProfile) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  // Ensure advertiser has budget via a deterministic dev payment.
  const topupProviderRef = "dev_bootstrap_topup";
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.upsert({
      where: { providerRef: topupProviderRef },
      update: {},
      create: {
        advertiserId: advertiserProfile.id,
        amountKrw: 100000,
        status: "PAID",
        provider: "DEV",
        providerRef: topupProviderRef
      },
      select: { id: true }
    });

    await tx.budgetLedger.createMany({
      data: [
        {
          advertiserId: advertiserProfile.id,
          amountKrw: 100000,
          reason: "TOPUP",
          refId: payment.id
        }
      ],
      skipDuplicates: true
    });
  });

  // Ensure a place.
  const place =
    (await prisma.place.findFirst({
      where: { advertiserId: advertiserProfile.id, name: "상도동 막걸리 우이락" },
      select: { id: true }
    })) ??
    (await prisma.place.create({
      data: {
        advertiserId: advertiserProfile.id,
        name: "상도동 막걸리 우이락",
        externalProvider: "NAVER_PLACE",
        externalId: "demo_place_1"
      },
      select: { id: true }
    }));

  // Create (or reuse) an active campaign.
  const today = toDateOnlyUtc(new Date());
  const end = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);

  const campaign =
    (await prisma.campaign.findFirst({
      where: { advertiserId: advertiserProfile.id, name: "데모 트래픽 캠페인" },
      select: { id: true, startDate: true, endDate: true, status: true, dailyTarget: true }
    })) ??
    (await prisma.campaign.create({
      data: {
        advertiserId: advertiserProfile.id,
        placeId: place.id,
        name: "데모 트래픽 캠페인",
        missionType: "TRAFFIC",
        dailyTarget: 5,
        startDate: today,
        endDate: end,
        unitPriceKrw: 40,
        rewardKrw: 10,
        budgetTotalKrw: 5 * 3 * 40,
        status: "ACTIVE"
      },
      select: { id: true, startDate: true, endDate: true, status: true, dailyTarget: true }
    }));

  if (campaign.status !== "ACTIVE") {
    await prisma.campaign.update({ where: { id: campaign.id }, data: { status: "ACTIVE" } });
  }

  // Ensure today's mission day exists.
  const missionDay = await prisma.missionDay.upsert({
    where: { campaignId_date: { campaignId: campaign.id, date: today } },
    update: { status: "ACTIVE" },
    create: {
      campaignId: campaign.id,
      date: today,
      quotaTotal: campaign.dailyTarget,
      quotaRemaining: campaign.dailyTarget,
      status: "ACTIVE"
    },
    select: { id: true }
  });

  // Create a participation already pending review with evidence.
  let participation = await prisma.participation.findFirst({
    where: { missionDayId: missionDay.id, rewarderId: memberProfile.id },
    select: { id: true, status: true }
  });

  if (!participation) {
    participation = await prisma.$transaction(async (tx) => {
      await tx.missionDay.updateMany({
        where: { id: missionDay.id, quotaRemaining: { gt: 0 } },
        data: { quotaRemaining: { decrement: 1 } }
      });

      const p = await tx.participation.create({
        data: {
          missionDayId: missionDay.id,
          rewarderId: memberProfile.id,
          status: "PENDING_REVIEW",
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          submittedAt: new Date()
        },
        select: { id: true, status: true }
      });

      await tx.verificationEvidence.create({
        data: {
          participationId: p.id,
          type: "IMAGE",
          fileRef: ONE_BY_ONE_PNG_DATA_URL,
          metadataJson: { demo: true }
        }
      });

      return p;
    });
  }

  // Ensure payout account + one payout request to test admin payout flow.
  const primary = await prisma.payoutAccount.findFirst({
    where: { rewarderId: memberProfile.id, isPrimary: true },
    select: { id: true }
  });

  const payoutAccountId =
    primary?.id ??
    (await prisma.$transaction(async (tx) => {
      await tx.payoutAccount.updateMany({ where: { rewarderId: memberProfile.id }, data: { isPrimary: false } });
      const acc = await tx.payoutAccount.create({
        data: {
          rewarderId: memberProfile.id,
          bankName: "국민은행",
          accountNumberMasked: maskAccountNumber("1234-5678-9012-3456"),
          accountHolderName: "데모",
          isPrimary: true
        },
        select: { id: true }
      });
      return acc.id;
    }));

  const payoutExisting = await prisma.payoutRequest.findFirst({
    where: { rewarderId: memberProfile.id, status: { in: ["REQUESTED", "APPROVED"] } },
    select: { id: true }
  });

  if (!payoutExisting) {
    await prisma.payoutRequest.create({
      data: {
        rewarderId: memberProfile.id,
        payoutAccountId,
        amountKrw: 1000,
        status: "REQUESTED",
        idempotencyKey: `dev_${crypto.randomUUID()}`
      }
    });
  }

  return NextResponse.json({
    ok: true,
    credentials: {
      advertiser: { email: advertiserEmail, password: DEFAULT_PASSWORD },
      member: { email: memberEmail, password: DEFAULT_PASSWORD },
      admin: { email: adminEmail, password: DEFAULT_PASSWORD }
    },
    created: {
      campaignId: campaign.id,
      missionDayId: missionDay.id,
      participationId: participation.id
    }
  });
}


