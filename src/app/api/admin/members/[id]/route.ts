import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";

const updateMemberSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(30).optional(),
  age: z.number().int().min(1).max(120).nullable().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).nullable().optional(),
  memberType: z.enum(["NORMAL", "TEAM_LEADER", "TEAM_PRO_LEADER"]).optional()
});

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole("ADMIN");
    if (user.adminType !== "SUPER") {
      return NextResponse.json({ error: "슈퍼 관리자 권한이 필요합니다." }, { status: 403 });
    }

    const member = await prisma.user.findFirst({
      where: { id: params.id, role: "MEMBER" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        memberType: true,
        memberProfile: {
          select: {
            id: true,
            age: true,
            gender: true,
            level: true,
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
      }
    });

    if (!member) {
      return NextResponse.json({ error: "회원 정보를 찾을 수 없습니다." }, { status: 404 });
    }

    const rewarderId = member.memberProfile?.id ?? null;

    const [balanceAgg, pendingAgg, rewardParticipations, teamMemberships, leaderTeams] = await Promise.all([
      rewarderId
        ? prisma.creditLedger.aggregate({
            where: { rewarderId },
            _sum: { amountKrw: true }
          })
        : Promise.resolve({ _sum: { amountKrw: 0 } }),
      rewarderId
        ? prisma.payoutRequest.aggregate({
            where: { rewarderId, status: { in: ["REQUESTED", "APPROVED"] } },
            _sum: { amountKrw: true }
          })
        : Promise.resolve({ _sum: { amountKrw: 0 } }),
      rewarderId
        ? prisma.participation.findMany({
            where: { rewarderId },
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
              id: true,
              status: true,
              startedAt: true,
              submittedAt: true,
              decidedAt: true,
              createdAt: true,
              missionDay: {
                select: {
                  date: true,
                  campaign: {
                    select: {
                      id: true,
                      name: true,
                      advertiser: { select: { user: { select: { name: true, email: true } } } },
                      place: { select: { name: true } }
                    }
                  }
                }
              }
            }
          })
        : Promise.resolve([]),
      prisma.teamMembership.findMany({
        where: { memberId: member.id },
        orderBy: { appliedAt: "desc" },
        take: 20,
        select: {
          id: true,
          role: true,
          status: true,
          appliedAt: true,
          decidedAt: true,
          team: {
            select: {
              id: true,
              name: true,
              status: true,
              experienceCampaign: {
                select: {
                  id: true,
                  title: true,
                  advertiser: { select: { user: { select: { name: true, email: true } } } },
                  place: { select: { name: true } }
                }
              }
            }
          }
        }
      }),
      prisma.team.findMany({
        where: { leaderId: member.id },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
          experienceCampaign: { select: { id: true, title: true } }
        }
      })
    ]);

    const balance = balanceAgg._sum.amountKrw ?? 0;
    const pending = pendingAgg._sum.amountKrw ?? 0;

    return NextResponse.json({
      member: {
        id: member.id,
        name: member.name ?? "",
        email: member.email ?? "",
        phone: member.phone ?? "",
        status: member.status,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
        memberType: member.memberType,
        profile: {
          age: member.memberProfile?.age ?? null,
          gender: member.memberProfile?.gender ?? null,
          level: member.memberProfile?.level ?? 1,
          trustScore: member.memberProfile?.trustScore ?? 0,
          warningCount: member.memberProfile?.warningCount ?? 0
        },
        points: {
          balanceKrw: balance,
          availableKrw: balance - pending
        },
        counts: {
          rewardParticipations: member.memberProfile?._count.participations ?? 0,
          experienceMemberships: member._count.teamMemberships,
          experienceLeaderTeams: member._count.teamLeaderTeams
        }
      },
      activities: {
        rewardParticipations,
        teamMemberships,
        leaderTeams
      }
    });
  } catch (error) {
    console.error("GET /api/admin/members/[id] error:", error);
    return NextResponse.json({ error: "회원 정보를 불러올 수 없습니다." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole("ADMIN");
    if (user.adminType !== "SUPER") {
      return NextResponse.json({ error: "슈퍼 관리자 권한이 필요합니다." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "입력값을 확인해주세요." }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({
      where: { id: params.id, role: "MEMBER" },
      select: { id: true, email: true }
    });

    if (!existing) {
      return NextResponse.json({ error: "회원 정보를 찾을 수 없습니다." }, { status: 404 });
    }

    const { name, email, phone, age, gender, memberType } = parsed.data;

    const normalizedEmail = email?.toLowerCase();
    if (normalizedEmail && normalizedEmail !== existing.email) {
      const duplicate = await prisma.user.findFirst({
        where: { email: normalizedEmail, NOT: { id: params.id } },
        select: { id: true }
      });
      if (duplicate) {
        return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 409 });
      }
    }

    await prisma.$transaction(async (tx) => {
      const userUpdate: Record<string, string | null> = {};
      if (name !== undefined) userUpdate.name = name.trim();
      if (normalizedEmail !== undefined) userUpdate.email = normalizedEmail;
      if (phone !== undefined) userUpdate.phone = phone.trim() || null;

      if (memberType !== undefined) {
        userUpdate.memberType = memberType;
      }

      if (Object.keys(userUpdate).length > 0) {
        await tx.user.update({
          where: { id: params.id },
          data: userUpdate
        });
      }

      if (age !== undefined || gender !== undefined) {
        await tx.memberProfile.upsert({
          where: { userId: params.id },
          update: {
            age: age ?? null,
            gender: gender ?? null
          },
          create: {
            userId: params.id,
            age: age ?? null,
            gender: gender ?? null
          }
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUT /api/admin/members/[id] error:", error);
    return NextResponse.json({ error: "회원 정보를 수정할 수 없습니다." }, { status: 500 });
  }
}

