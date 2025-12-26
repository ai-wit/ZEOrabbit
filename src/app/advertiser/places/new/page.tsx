import Link from "next/link";
import { PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Card, CardBody, Input, Label } from "@/app/_ui/primitives";
import { AdvertiserHeader } from "../../_components/AdvertiserHeader";

export default function NewPlacePage() {
  return (
    <PageShell
      header={
        <AdvertiserHeader
          title="플레이스 등록"
          description="MVP에서는 플레이스명만으로도 등록 가능합니다."
        />
      }
    >
      <Card>
        <CardBody>
          <form action="/api/advertiser/places" method="post" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">플레이스명</Label>
              <Input id="name" name="name" required maxLength={255} placeholder="예: 상도동 막걸리 우이락" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="externalProvider">외부 Provider(선택)</Label>
                <Input id="externalProvider" name="externalProvider" maxLength={64} placeholder="예: NAVER_PLACE" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="externalId">외부 ID(선택)</Label>
                <Input id="externalId" name="externalId" maxLength={128} placeholder="provider-specific id" />
              </div>
            </div>

            <Button type="submit" variant="primary" className="w-full">
              등록
            </Button>
          </form>
        </CardBody>
      </Card>
    </PageShell>
  );
}


