import Link from "next/link";

export default function NewPlacePage() {
  return (
    <main className="mx-auto max-w-lg space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">플레이스 등록</h1>
        <div className="text-sm text-zinc-400">
          MVP에서는 플레이스명만으로도 등록 가능합니다.
        </div>
      </header>

      <form
        action="/api/advertiser/places"
        method="post"
        className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-6"
      >
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm text-zinc-200">
            플레이스명
          </label>
          <input
            id="name"
            name="name"
            required
            maxLength={255}
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
            placeholder="예: 상도동 막걸리 우이락"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="externalProvider" className="text-sm text-zinc-200">
              외부 Provider(선택)
            </label>
            <input
              id="externalProvider"
              name="externalProvider"
              maxLength={64}
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
              placeholder="예: NAVER_PLACE"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="externalId" className="text-sm text-zinc-200">
              외부 ID(선택)
            </label>
            <input
              id="externalId"
              name="externalId"
              maxLength={128}
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
              placeholder="provider-specific id"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
        >
          등록
        </button>
      </form>

      <div className="flex gap-3">
        <Link
          href="/advertiser/places"
          className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
        >
          목록으로
        </Link>
      </div>
    </main>
  );
}


