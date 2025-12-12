import Link from "next/link";
import { requireRole } from "@/server/auth/require-user";
import { getAdvertiserProfileIdByUserId } from "@/server/advertiser/advertiser-profile";
import { prisma } from "@/server/prisma";

export default async function AdvertiserPlacesPage() {
  const user = await requireRole("ADVERTISER");
  const advertiserId = await getAdvertiserProfileIdByUserId(user.id);

  const places = await prisma.place.findMany({
    where: { advertiserId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      externalProvider: true,
      externalId: true,
      createdAt: true
    }
  });

  return (
    <main className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">플레이스 관리</h1>
          <div className="text-sm text-zinc-400">
            캠페인 생성 전에 대상 플레이스를 등록합니다.
          </div>
        </div>
        <Link
          href="/advertiser/places/new"
          className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
        >
          새 플레이스
        </Link>
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30">
        <div className="border-b border-zinc-800 px-6 py-4 text-sm text-zinc-300">
          총 {places.length}개
        </div>
        <div className="divide-y divide-zinc-800">
          {places.length === 0 ? (
            <div className="px-6 py-10 text-sm text-zinc-400">
              아직 등록된 플레이스가 없습니다.
            </div>
          ) : (
            places.map((p) => (
              <div key={p.id} className="px-6 py-4">
                <div className="font-medium">{p.name}</div>
                <div className="mt-1 text-xs text-zinc-400">
                  {p.externalProvider ?? "—"} {p.externalId ? `(${p.externalId})` : ""}
                  {" · "}
                  {new Date(p.createdAt).toLocaleString("ko-KR")}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="flex gap-3">
        <Link
          href="/advertiser"
          className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
        >
          광고주 홈
        </Link>
      </div>
    </main>
  );
}


