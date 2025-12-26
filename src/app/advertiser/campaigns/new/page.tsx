import Link from "next/link";
import { requireRole } from "@/server/auth/require-user";
import { getAdvertiserProfileIdByUserId } from "@/server/advertiser/advertiser-profile";
import { prisma } from "@/server/prisma";
import { PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Card, CardBody, EmptyState, Hint, Input, Label, Select } from "@/app/_ui/primitives";
import { DateInput } from "@/app/_ui/DateInput";
import { AdvertiserHeader } from "../../_components/AdvertiserHeader";

export default async function NewCampaignPage() {
  const user = await requireRole("ADVERTISER");
  const advertiserId = await getAdvertiserProfileIdByUserId(user.id);

  const places = await prisma.place.findMany({
    where: { advertiserId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true }
  });

  return (
    <PageShell
      header={
        <AdvertiserHeader
          title="캠페인 생성"
          description="MVP 기본값으로 트래픽(방문) 캠페인을 생성합니다."
        />
      }
    >
      {places.length === 0 ? (
        <Card>
          <EmptyState
            title="캠페인을 만들려면 먼저 플레이스를 등록해야 합니다."
            action={
              <ButtonLink href="/advertiser/places/new" variant="primary" size="sm">
                플레이스 등록하러 가기
              </ButtonLink>
            }
          />
        </Card>
      ) : (
        <Card>
          <CardBody>
            <form action="/api/advertiser/campaigns" method="post" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="placeId">플레이스</Label>
                <Select id="placeId" name="placeId" required>
                  {places.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">캠페인명</Label>
                <Input id="name" name="name" required maxLength={255} placeholder="예: 12월 1주 트래픽 캠페인" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">시작일</Label>
                  <DateInput id="startDate" name="startDate" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">종료일</Label>
                  <DateInput id="endDate" name="endDate" required />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dailyTarget">일일 목표 수량</Label>
                  <Input id="dailyTarget" name="dailyTarget" type="number" required min={1} step={1} placeholder="예: 150" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitPriceKrw">단가(원)</Label>
                  <Input id="unitPriceKrw" name="unitPriceKrw" type="number" required min={1} step={1} placeholder="예: 40" />
                </div>
              </div>

              <Hint>리워드 금액은 정책(현재: 단가의 25%)으로 자동 계산됩니다.</Hint>

              <Button type="submit" variant="primary" className="w-full">
                생성(DRAFT)
              </Button>
            </form>
          </CardBody>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/advertiser" variant="secondary">
          광고주 홈
        </ButtonLink>
      </div>
    </PageShell>
  );
}


