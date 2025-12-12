import Link from "next/link";
import { requireRole } from "@/server/auth/require-user";
import { getAdvertiserProfileIdByUserId } from "@/server/advertiser/advertiser-profile";
import { prisma } from "@/server/prisma";

export default async function NewCampaignPage() {
  const user = await requireRole("ADVERTISER");
  const advertiserId = await getAdvertiserProfileIdByUserId(user.id);

  const places = await prisma.place.findMany({
    where: { advertiserId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true }
  });

  return (
    <main className="mx-auto max-w-lg space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">캠페인 생성</h1>
        <div className="text-sm text-zinc-400">
          MVP 기본값으로 트래픽(방문) 캠페인을 생성합니다.
        </div>
      </header>

      {places.length === 0 ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 text-sm text-zinc-300">
          캠페인을 만들려면 먼저 플레이스를 등록해야 합니다.
          <div className="mt-4">
            <Link
              href="/advertiser/places/new"
              className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
            >
              플레이스 등록하러 가기
            </Link>
          </div>
        </section>
      ) : (
        <form
          action="/api/advertiser/campaigns"
          method="post"
          className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-6"
        >
          <div className="space-y-2">
            <label htmlFor="placeId" className="text-sm text-zinc-200">
              플레이스
            </label>
            <select
              id="placeId"
              name="placeId"
              required
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
            >
              {places.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="name" className="text-sm text-zinc-200">
              캠페인명
            </label>
            <input
              id="name"
              name="name"
              required
              maxLength={255}
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
              placeholder="예: 12월 1주 트래픽 캠페인"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="startDate" className="text-sm text-zinc-200">
                시작일
              </label>
              <input
                id="startDate"
                name="startDate"
                type="date"
                required
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="endDate" className="text-sm text-zinc-200">
                종료일
              </label>
              <input
                id="endDate"
                name="endDate"
                type="date"
                required
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="dailyTarget" className="text-sm text-zinc-200">
                일일 목표 수량
              </label>
              <input
                id="dailyTarget"
                name="dailyTarget"
                type="number"
                required
                min={1}
                step={1}
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                placeholder="예: 150"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="unitPriceKrw" className="text-sm text-zinc-200">
                단가(원)
              </label>
              <input
                id="unitPriceKrw"
                name="unitPriceKrw"
                type="number"
                required
                min={1}
                step={1}
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                placeholder="예: 40"
              />
            </div>
          </div>

          <div className="text-xs text-zinc-400">
            리워드 금액은 정책(현재: 단가의 25%)으로 자동 계산됩니다.
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
          >
            생성(DRAFT)
          </button>
        </form>
      )}

      <div className="flex gap-3">
        <Link
          href="/advertiser/campaigns"
          className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
        >
          목록으로
        </Link>
      </div>
    </main>
  );
}


