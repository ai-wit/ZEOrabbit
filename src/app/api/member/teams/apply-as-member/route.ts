import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";

// POST /api/member/teams/apply-as-member - 팀원으로 참여 신청
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole("MEMBER");

    const body = await request.json();
    const { teamId } = z.object({ teamId: z.string() }).parse(body);

    // 팀 정보 조회
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        experienceCampaign: true,
        memberships: {
          where: { status: "APPROVED" },
          select: { id: true }
        }
      }
    });

    if (!team) {
      return NextResponse.json(
        { error: "존재하지 않는 팀입니다" },
        { status: 404 }
      );
    }

    // 팀 상태 확인
    if (team.status !== "FORMING") {
      return NextResponse.json(
        { error: "참여 신청을 받지 않는 팀입니다" },
        { status: 400 }
      );
    }

    // 체험단 공고 상태 확인
    if (team.experienceCampaign.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "종료된 체험단입니다" },
        { status: 400 }
      );
    }

    // 이미 참여 중인지 확인
    const existingMembership = await prisma.teamMembership.findFirst({
      where: {
        teamId,
        memberId: user.id,
        status: { in: ["PENDING", "APPROVED"] }
      }
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: "이미 참여 중인 팀입니다" },
        { status: 409 }
      );
    }

    // 다른 팀에 참여 중인지 확인
    const otherMembership = await prisma.teamMembership.findFirst({
      where: {
        team: { experienceCampaignId: team.experienceCampaignId },
        memberId: user.id,
        status: { in: ["PENDING", "APPROVED"] }
      }
    });

    if (otherMembership) {
      return NextResponse.json(
        { error: "이미 다른 팀에 참여 중입니다" },
        { status: 409 }
      );
    }

    // 팀 정원 확인
    if (team.memberships.length >= team.experienceCampaign.maxMembersPerTeam) {
      return NextResponse.json(
        { error: "팀 정원이 초과되었습니다" },
        { status: 400 }
      );
    }

    // 팀원 참여 신청 생성
    const membership = await prisma.teamMembership.create({
      data: {
        teamId,
        memberId: user.id,
        role: "MEMBER",
        status: "PENDING", // 팀장 승인 대기
      },
      include: {
        team: {
          include: {
            experienceCampaign: { select: { title: true } },
            leader: { select: { name: true } }
          }
        },
        member: { select: { name: true } }
      }
    });

    return NextResponse.json({
      message: "팀 참여 신청이 완료되었습니다. 팀장 승인을 기다려주세요.",
      membership
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "유효하지 않은 입력입니다", details: error.errors },
        { status: 400 }
      );
    }

    console.error("팀 참여 신청 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
