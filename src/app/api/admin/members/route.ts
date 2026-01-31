import { NextRequest, NextResponse } from "next/server";
import { MemberType, Prisma } from "@prisma/client";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";

const AGE_GROUPS: Record<string, { min: number; max: number | null }> = {
  "10s": { min: 0, max: 19 },
  "20s": { min: 20, max: 29 },
  "30s": { min: 30, max: 39 },
  "40s": { min: 40, max: 49 },
  "50s": { min: 50, max: 59 },
  "60plus": { min: 60, max: null }
};

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function buildAgeCondition(ageGroup: string | null): Prisma.IntNullableFilter | undefined {
  if (!ageGroup) return undefined;
  const group = AGE_GROUPS[ageGroup];
  if (!group) return undefined;
  if (group.max === null) {
    return { gte: group.min };
  }
  return { gte: group.min, lte: group.max };
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole("ADMIN");
    if (user.adminType !== "SUPER") {
      return NextResponse.json({ error: "슈퍼 관리자 권한이 필요합니다." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const pageSize = parsePositiveInt(searchParams.get("pageSize"), 20);
    const q = (searchParams.get("q") || "").trim();
    const searchType = searchParams.get("searchType") || "name";
    const gender = searchParams.get("gender") || "";
    const memberTypeParam = searchParams.get("memberType");
    const ageGroup = searchParams.get("ageGroup");

    const where: Prisma.UserWhereInput = { role: "MEMBER" };
    if (q) {
      if (searchType === "email") {
        where.email = { contains: q };
      } else if (searchType === "phone") {
        where.phone = { contains: q };
      } else {
        where.name = { contains: q };
      }
    }

    const memberProfileWhere: Prisma.MemberProfileWhereInput = {};
    if (gender) {
      memberProfileWhere.gender = gender;
    }

    const ageCondition = buildAgeCondition(ageGroup);
    if (ageCondition) {
      memberProfileWhere.age = ageCondition;
    }

    if (Object.keys(memberProfileWhere).length > 0) {
      where.memberProfile = memberProfileWhere;
    }

    if (memberTypeParam) {
      const allowedTypes: MemberType[] = ["NORMAL", "TEAM_LEADER", "TEAM_PRO_LEADER"];
      if (allowedTypes.includes(memberTypeParam as MemberType)) {
        where.memberType = memberTypeParam as MemberType;
      }
    }

    const [totalCount, members] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          createdAt: true,
          memberType: true,
          memberProfile: {
            select: {
              id: true,
              age: true,
              gender: true,
              trustScore: true,
              warningCount: true,
              _count: { select: { participations: true } }
            }
          },
          _count: {
            select: {
              teamMemberships: true,
              teamLeaderTeams: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    const rewarderIds = members
      .map((member) => member.memberProfile?.id)
      .filter((id): id is string => Boolean(id));

    const ledgerAgg = rewarderIds.length
      ? await prisma.creditLedger.groupBy({
          by: ["rewarderId"],
          where: { rewarderId: { in: rewarderIds } },
          _sum: { amountKrw: true }
        })
      : [];

    const balanceByRewarderId = new Map(
      ledgerAgg.map((row) => [row.rewarderId, row._sum.amountKrw ?? 0])
    );

    const payload = members.map((member) => {
      const profile = member.memberProfile;
      return {
        id: member.id,
        name: member.name ?? "",
        email: member.email ?? "",
        phone: member.phone ?? "",
        status: member.status,
        createdAt: member.createdAt,
        memberType: member.memberType ?? null,
        age: profile?.age ?? null,
        gender: profile?.gender ?? null,
        trustScore: profile?.trustScore ?? 0,
        warningCount: profile?.warningCount ?? 0,
        rewardParticipationCount: profile?._count.participations ?? 0,
        experienceMembershipCount: member._count.teamMemberships,
        experienceLeaderCount: member._count.teamLeaderTeams,
        pointsKrw: profile ? balanceByRewarderId.get(profile.id) ?? 0 : 0
      };
    });

    return NextResponse.json({
      members: payload,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / pageSize))
      }
    });
  } catch (error) {
    console.error("GET /api/admin/members error:", error);
    return NextResponse.json({ error: "회원 목록을 불러올 수 없습니다." }, { status: 500 });
  }
}

