"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/app/_ui/shell";
import { Button, ButtonLink } from "@/app/_ui/primitives";

interface AdminHeaderProps {
  title: string;
  description: string;
}

export function AdminHeader({ title, description }: AdminHeaderProps) {
  const [user, setUser] = useState<any>(null);
  const [managedAdvertisers, setManagedAdvertisers] = useState<any[]>([]);

  useEffect(() => {
    // 사용자 정보와 담당 광고주 정보 가져오기
    fetch('/api/me')
      .then(res => res.json())
      .then(data => {
        setUser(data.user);
        if (data.user?.adminType === "MANAGER") {
          // 매니저인 경우 담당 광고주 목록 조회
          fetch('/api/admin/managers/assigned-advertisers')
            .then(res => res.json())
            .then(data => setManagedAdvertisers(data.advertisers || []))
            .catch(err => console.error('담당 광고주 조회 실패:', err));
        }
      })
      .catch(err => console.error('사용자 정보 조회 실패:', err));
  }, []);

  const isManager = user?.adminType === "MANAGER";

  return (
    <PageHeader
      eyebrow={isManager ? "MANAGER" : "ADMIN"}
      title={title}
      description={description}
      right={
        <div className="flex flex-wrap items-center gap-2">
          {/* 슈퍼관리자만 매니저 관리 메뉴 표시 */}
          {!isManager && (
            <ButtonLink href="/admin/managers" variant="secondary" size="sm">
              👥 매니저
            </ButtonLink>
          )}

          <ButtonLink href="/admin/advertisers" variant="secondary" size="sm">
            🏢 광고주
          </ButtonLink>
          <ButtonLink href="/admin/campaigns" variant="secondary" size="sm">
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
