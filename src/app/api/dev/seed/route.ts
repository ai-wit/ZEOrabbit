import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.redirect(new URL("/", req.url), 303);
  }

  await prisma.$transaction(async (tx) => {
    await tx.policy.updateMany({
      data: { isActive: false }
    });

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

    await tx.auditLog.create({
      data: {
        actorUserId: null,
        action: "DEV_SEED_POLICIES"
      }
    });
  });

  return NextResponse.json({ ok: true });
}


