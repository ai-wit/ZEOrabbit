"use client";

import { useContext } from "react";
import { PageHeader } from "@/app/_ui/shell";
import { Button, ButtonLink } from "@/app/_ui/primitives";
import { AdminContext } from "../AdminProvider";

interface AdminHeaderProps {
  title: string;
  description: string;
}

export function AdminHeader({ title, description }: AdminHeaderProps) {
  const adminData = useContext(AdminContext);

  if (!adminData) {
    // 폴백: 기본 메뉴 표시 (로딩 중)
    return (
      <PageHeader
        eyebrow="ADMIN"
        title={title}
        description={description}
        right={
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm text-zinc-400">로딩 중...</div>
          </div>
        }
      />
    );
  }

  const { user } = adminData;
  const isManager = user?.adminType === "MANAGER";

  return (
    <PageHeader
      eyebrow={isManager ? "MANAGER" : "ADMIN"}
      title={title}
      description={description}
      right={
        <div className="flex flex-wrap items-center gap-2">
          <ButtonLink href="/admin" variant="secondary" size="sm">
            📊 대시보드
          </ButtonLink>

          {/* 슈퍼관리자만 매니저 관리 메뉴 표시 */}
          {!isManager && (
            <ButtonLink href="/admin/managers" variant="secondary" size="sm">
              👥 매니저
            </ButtonLink>
          )}

          <ButtonLink href="/admin/advertisers" variant="secondary" size="sm">
            🏢 광고주
          </ButtonLink>
          {/* 상품 메뉴는 매니저에게 표시하지 않음 */}
          {!isManager && (
            <ButtonLink href="/admin/products" variant="secondary" size="sm">
              🧩 상품
            </ButtonLink>
          )}
          <ButtonLink href={isManager ? "/admin/reward/campaigns" : "/admin/campaigns"} variant="secondary" size="sm">
            📊 캠페인
          </ButtonLink>
          <ButtonLink href="/admin/experience" variant="secondary" size="sm">
            🎯 체험단
          </ButtonLink>

          {/* 출금 요청 메뉴는 매니저에게 표시하지 않음 */}
          {!isManager && (
            <ButtonLink href="/admin/payouts" variant="secondary" size="sm">
              💰 출금 요청
            </ButtonLink>
          )}

          {/* 정책 설정 메뉴는 슈퍼관리자에게만 표시 */}
          {!isManager && (
            <ButtonLink href="/admin/policies" variant="secondary" size="sm">
              ⚙️ 정책 설정
            </ButtonLink>
          )}

          <ButtonLink href="/" variant="secondary" size="sm">
            홈
          </ButtonLink>
          <form action="/api/auth/logout" method="post">
            <Button type="submit" variant="danger" size="sm">
              로그아웃
            </Button>
          </form>
        </div>
      }
    />
  );
}
