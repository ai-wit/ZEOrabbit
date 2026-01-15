import { PageShell } from "@/app/_ui/shell";
import { Button, Card, CardBody, Input, Label } from "@/app/_ui/primitives";
import { AdvertiserHeader } from "../../_components/AdvertiserHeader";

export default function NewPlacePage() {
  return (
    <PageShell
      header={
        <AdvertiserHeader
          title="플레이스 등록"
          description="네이버 플레이스 URL 형식으로 등록합니다."
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

            <div className="space-y-2">
              <Label htmlFor="naverPlaceId">네이버 플레이스 URL</Label>
              <div className="flex w-full items-stretch overflow-hidden rounded-md border border-white/10 bg-white/5">
                <div className="flex shrink-0 items-center border-r border-white/10 px-3 text-sm text-zinc-300">
                  https://m.place.naver.com/place/
                </div>
                <input
                  id="naverPlaceId"
                  name="naverPlaceId"
                  required
                  inputMode="numeric"
                  pattern="^[0-9]+$"
                  maxLength={32}
                  placeholder="11556036"
                  className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-500"
                  aria-describedby="naverPlaceIdHelp"
                />
              </div>
              <div id="naverPlaceIdHelp" className="text-xs text-zinc-400">
                숫자 ID만 입력하세요. 예) <span className="font-mono">11556036</span>
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


