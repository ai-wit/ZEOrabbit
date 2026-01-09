import { requireRole } from "@/server/auth/require-user";
import { PageShell } from "@/app/_ui/shell";
import { Button, Card, CardBody, Input, Label, Select } from "@/app/_ui/primitives";
import { AdminHeader } from "../../_components/AdminHeader";

export default async function AdminProductNewPage() {
  const user = await requireRole("ADMIN");

  return (
    <PageShell
      header={
        <AdminHeader
          title="상품 생성"
          description={`${user.email ?? user.id} (${user.role})`}
        />
      }
    >
      <Card>
        <CardBody className="space-y-6">
          <form action="/api/admin/products" method="post" className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">상품명</Label>
              <Input id="name" name="name" required maxLength={100} placeholder="예: 100% 리얼 휴먼 트래픽" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="missionType">상품 구분(미션 유형)</Label>
                <Select id="missionType" name="missionType" required>
                  <option value="TRAFFIC">TRAFFIC (유입)</option>
                  <option value="SAVE">SAVE (저장)</option>
                  <option value="SHARE">SHARE (공유)</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitPriceKrw">단가(원)</Label>
                <Input id="unitPriceKrw" name="unitPriceKrw" type="number" min={1} step={1} required placeholder="예: 100" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vatPercent">VAT(%)</Label>
                <Input id="vatPercent" name="vatPercent" type="number" min={0} max={100} step={1} defaultValue={0} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minOrderDays">최소 주문 기간(일)</Label>
                <Input id="minOrderDays" name="minOrderDays" type="number" min={1} max={365} step={1} defaultValue={7} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="marketingCopy">상품 설명 문구</Label>
              <textarea
                id="marketingCopy"
                name="marketingCopy"
                rows={4}
                placeholder="광고주에게 노출될 마케팅 카피를 입력하세요."
                className="w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guideText">상세 가이드</Label>
              <textarea
                id="guideText"
                name="guideText"
                rows={8}
                placeholder="구매 후 운영 가이드/주의사항 등을 입력하세요."
                className="w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/10"
              />
            </div>

            <div className="flex items-center gap-3">
              <input id="isActive" name="isActive" type="checkbox" className="h-4 w-4" defaultChecked />
              <Label htmlFor="isActive">판매/노출 활성화</Label>
            </div>

            <Button type="submit" variant="primary" className="w-full">
              생성
            </Button>
          </form>
        </CardBody>
      </Card>
    </PageShell>
  );
}

