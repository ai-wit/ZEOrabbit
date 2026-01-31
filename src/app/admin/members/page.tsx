"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageShell } from "@/app/_ui/shell";
import {
  Button,
  ButtonLink,
  Card,
  CardBody,
  EmptyState,
  Input,
  Label,
  Select
} from "@/app/_ui/primitives";
import { AdminHeader } from "../_components/AdminHeader";
import { getUserStatusLabel } from "@/lib/status-labels";

interface MemberRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  createdAt: string;
  memberType: string | null;
  age: number | null;
  gender: string | null;
  trustScore: number;
  warningCount: number;
  rewardParticipationCount: number;
  experienceMembershipCount: number;
  experienceLeaderCount: number;
  pointsKrw: number;
}

interface PaginationData {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("ko-KR").format(n);
}

function formatDate(d: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(d));
}

function formatGender(gender: string | null): string {
  if (gender === "MALE") return "남성";
  if (gender === "FEMALE") return "여성";
  if (gender === "OTHER") return "기타";
  return "미등록";
}

function formatMemberType(memberType: string | null): string {
  if (memberType === "TEAM_LEADER") return "리더";
  if (memberType === "TEAM_PRO_LEADER") return "프로리더";
  return "일반";
}

export default function AdminMembersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Number(searchParams?.get("page") || 1);
  const pageSizeParam = Number(searchParams?.get("pageSize") || 20);
  const qParam = searchParams?.get("q") || "";
  const searchTypeParam = searchParams?.get("searchType") || "name";
  const genderParam = searchParams?.get("gender") || "";
  const memberTypeParam = searchParams?.get("memberType") || "";
  const ageGroupParam = searchParams?.get("ageGroup") || "";

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    pageSize: 20,
    totalCount: 0,
    totalPages: 1
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [filters, setFilters] = useState({
    q: qParam,
    searchType: searchTypeParam,
    gender: genderParam,
    memberType: memberTypeParam,
    ageGroup: ageGroupParam,
    pageSize: pageSizeParam
  });

  useEffect(() => {
    setFilters({
      q: qParam,
      searchType: searchTypeParam,
      gender: genderParam,
      memberType: memberTypeParam,
      ageGroup: ageGroupParam,
      pageSize: pageSizeParam
    });
  }, [qParam, searchTypeParam, genderParam, memberTypeParam, ageGroupParam, pageSizeParam]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSizeParam));
    if (qParam) params.set("q", qParam);
    if (searchTypeParam) params.set("searchType", searchTypeParam);
    if (genderParam) params.set("gender", genderParam);
    if (memberTypeParam) params.set("memberType", memberTypeParam);
    if (ageGroupParam) params.set("ageGroup", ageGroupParam);
    return params.toString();
  }, [page, pageSizeParam, qParam, searchTypeParam, genderParam, memberTypeParam, ageGroupParam]);

  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/members?${queryString}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "회원 목록을 불러올 수 없습니다.");
      }
      const data = await response.json();
      setMembers(data.members || []);
      setPagination(data.pagination || { page: 1, pageSize: 20, totalCount: 0, totalPages: 1 });
    } catch (err) {
      console.error("회원 목록 조회 실패:", err);
      setError(err instanceof Error ? err.message : "회원 목록을 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const applyFilters = () => {
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("pageSize", String(filters.pageSize));
    if (filters.q) params.set("q", filters.q);
    if (filters.searchType) params.set("searchType", filters.searchType);
    if (filters.gender) params.set("gender", filters.gender);
    if (filters.memberType) params.set("memberType", filters.memberType);
    if (filters.ageGroup) params.set("ageGroup", filters.ageGroup);
    router.push(`/admin/members?${params.toString()}`);
  };

  const handlePageChange = (nextPage: number) => {
    const params = new URLSearchParams(queryString);
    params.set("page", String(nextPage));
    router.push(`/admin/members?${params.toString()}`);
  };

  const totalCountText = formatNumber(pagination.totalCount);

  return (
    <PageShell
      header={
        <AdminHeader
          title="회원관리"
          description="회원 목록을 조회하고 상세 정보 및 활동을 관리합니다."
        />
      }
    >
      <div className="space-y-6">
        <Card>
          <CardBody className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-zinc-50">검색 및 필터</div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setFiltersOpen((prev) => !prev)}
              >
                {filtersOpen ? "접기" : "펼치기"}
              </Button>
            </div>
            {filtersOpen && (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="searchType">검색 항목</Label>
                    <Select
                      id="searchType"
                      value={filters.searchType}
                      onChange={(e) => setFilters((prev) => ({ ...prev, searchType: e.target.value }))}
                    >
                      <option value="name">이름</option>
                      <option value="phone">전화번호</option>
                      <option value="email">이메일</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="searchQuery">검색어</Label>
                    <Input
                      id="searchQuery"
                      value={filters.q}
                      onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
                      placeholder="검색어를 입력하세요"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="memberType">회원 등급</Label>
                    <Select
                      id="memberType"
                      value={filters.memberType}
                      onChange={(e) => setFilters((prev) => ({ ...prev, memberType: e.target.value }))}
                    >
                      <option value="">전체</option>
                      <option value="NORMAL">일반</option>
                      <option value="TEAM_LEADER">리더</option>
                      <option value="TEAM_PRO_LEADER">프로리더</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">성별</Label>
                    <Select
                      id="gender"
                      value={filters.gender}
                      onChange={(e) => setFilters((prev) => ({ ...prev, gender: e.target.value }))}
                    >
                      <option value="">전체</option>
                      <option value="MALE">남성</option>
                      <option value="FEMALE">여성</option>
                      <option value="OTHER">기타</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ageGroup">연령</Label>
                    <Select
                      id="ageGroup"
                      value={filters.ageGroup}
                      onChange={(e) => setFilters((prev) => ({ ...prev, ageGroup: e.target.value }))}
                    >
                      <option value="">전체</option>
                      <option value="10s">10대 이하</option>
                      <option value="20s">20대</option>
                      <option value="30s">30대</option>
                      <option value="40s">40대</option>
                      <option value="50s">50대</option>
                      <option value="60plus">60대 이상</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pageSize">페이지당 출력수</Label>
                    <Select
                      id="pageSize"
                      value={String(filters.pageSize)}
                      onChange={(e) => setFilters((prev) => ({ ...prev, pageSize: Number(e.target.value) }))}
                    >
                      <option value="10">10개</option>
                      <option value="20">20개</option>
                      <option value="50">50개</option>
                      <option value="100">100개</option>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button variant="primary" onClick={applyFilters}>
                    검색 적용
                  </Button>
                  <ButtonLink href="/admin/members" variant="secondary">
                    필터 초기화
                  </ButtonLink>
                </div>
              </>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-zinc-50">회원 목록 ({totalCountText}명)</div>
              <div className="text-xs text-zinc-400">페이지 {pagination.page} / {pagination.totalPages}</div>
            </div>

            {loading ? (
              <div className="py-10 text-center text-sm text-zinc-400">불러오는 중...</div>
            ) : error ? (
              <div className="py-10 text-center text-sm text-red-400">{error}</div>
            ) : members.length === 0 ? (
              <EmptyState title="조회된 회원이 없습니다." />
            ) : (
              <div className="overflow-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-surface-muted text-text-subtle">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">회원</th>
                      <th className="px-4 py-3 text-left font-semibold">연락처</th>
                      <th className="px-4 py-3 text-left font-semibold">등급/성별/연령</th>
                      <th className="px-4 py-3 text-left font-semibold">포인트</th>
                      <th className="px-4 py-3 text-left font-semibold">활동수</th>
                      <th className="px-4 py-3 text-left font-semibold">상태</th>
                      <th className="px-4 py-3 text-left font-semibold">가입일</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {members.map((member) => (
                      <tr key={member.id} className="hover:bg-surface-strong/60">
                        <td className="px-4 py-3">
                          <ButtonLink href={`/admin/members/${member.id}`} variant="secondary" size="sm">
                            {member.name || "이름 없음"}
                          </ButtonLink>
                          <div className="text-xs text-zinc-400">{member.email || "이메일 없음"}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div>{member.phone || "번호 없음"}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div>{formatMemberType(member.memberType)}</div>
                          <div className="text-xs text-zinc-400">
                            {formatGender(member.gender)} · {member.age ? `${member.age}세` : "연령 미등록"}
                          </div>
                        </td>
                        <td className="px-4 py-3">{formatNumber(member.pointsKrw)}P</td>
                        <td className="px-4 py-3">
                          <div>리워드 {formatNumber(member.rewardParticipationCount)}</div>
                          <div className="text-xs text-zinc-400">
                            체험단 {formatNumber(member.experienceMembershipCount + member.experienceLeaderCount)}
                          </div>
                        </td>
                        <td className="px-4 py-3">{getUserStatusLabel(member.status)}</td>
                        <td className="px-4 py-3">{formatDate(member.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!loading && pagination.totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="text-text-subtle">총 {totalCountText}명</div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => handlePageChange(pagination.page - 1)}
                  >
                    이전
                  </Button>
                  <span className="text-xs text-text-subtle">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => handlePageChange(pagination.page + 1)}
                  >
                    다음
                  </Button>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </PageShell>
  );
}

