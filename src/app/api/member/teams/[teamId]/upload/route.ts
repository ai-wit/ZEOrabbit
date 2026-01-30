import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getUploadDirForReading } from "@/server/upload/storage";

// 팀장 권한 확인 헬퍼 함수
async function requireTeamLeader(teamId: string) {
  const user = await requireRole("MEMBER");

  if (user.memberType !== "TEAM_LEADER") {
    throw new Error("팀장 권한이 필요합니다");
  }

  // 팀장 권한 확인
  const team = await prisma.team.findUnique({
    where: { id: teamId }
  });

  if (!team || team.leaderId !== user.id) {
    throw new Error("팀장 권한이 없습니다");
  }

  return user;
}

// 파일이 ZIP인지 확인하는 함수
function isZipFile(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  // ZIP 파일 시그니처: PK\x03\x04
  return buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
}

// POST /api/member/teams/[teamId]/upload - 파일 업로드
export async function POST(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const user = await requireTeamLeader(params.teamId);

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "업로드할 파일이 없습니다" },
        { status: 400 }
      );
    }

    // 파일 크기 검증 (300MB = 314,572,800 bytes)
    const maxSize = 300 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "파일 크기는 300MB를 초과할 수 없습니다" },
        { status: 400 }
      );
    }

    // 파일 타입 검증
    if (!file.type.includes("zip") && !file.name.toLowerCase().endsWith(".zip")) {
      return NextResponse.json(
        { error: "ZIP 파일만 업로드할 수 있습니다" },
        { status: 400 }
      );
    }

    // 파일 내용 검증 (시그니처 확인)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (!isZipFile(buffer)) {
      return NextResponse.json(
        { error: "유효하지 않은 ZIP 파일입니다" },
        { status: 400 }
      );
    }

    // 업로드 디렉토리 생성
    const uploadBaseDir = getUploadDirForReading();
    const uploadDir = join(uploadBaseDir, "materials", params.teamId);
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      console.error("업로드 디렉토리 생성 실패:", error);
      return NextResponse.json(
        { error: "파일 저장 준비 중 오류가 발생했습니다" },
        { status: 500 }
      );
    }

    // 파일명 생성 (UUID + .zip 확장자)
    const fileName = `${randomUUID()}.zip`;
    const filePath = join(uploadDir, fileName);

    // 파일 저장
    try {
      await writeFile(filePath, buffer);
    } catch (error) {
      console.error("파일 저장 실패:", error);
      return NextResponse.json(
        { error: "파일 저장 중 오류가 발생했습니다" },
        { status: 500 }
      );
    }

    // 상대 경로로 저장 (보안을 위해)
    const relativePath = `uploads/materials/${params.teamId}/${fileName}`;

    return NextResponse.json({
      message: "파일이 성공적으로 업로드되었습니다",
      filePath: relativePath,
      fileSize: file.size,
      originalName: file.name
    });
  } catch (error) {
    console.error("파일 업로드 실패:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "서버 오류가 발생했습니다" },
      { status: error instanceof Error && error.message.includes("권한") ? 403 : 500 }
    );
  }
}
