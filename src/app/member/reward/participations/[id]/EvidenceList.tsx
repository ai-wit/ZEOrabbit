"use client";

import { useMemo, useState } from "react";
import { Pill } from "@/app/_ui/primitives";

type EvidenceItem = {
  id: string;
  type: string;
  fileRef: string | null;
  metadataJson: unknown;
  createdAt: string | Date;
};

export function EvidenceList({ evidences }: { evidences: EvidenceItem[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(
    evidences.length > 0 ? evidences[0].id : null
  );
  const selectedEvidence = useMemo(
    () => evidences.find((evidence) => evidence.id === selectedId) ?? evidences[0] ?? null,
    [evidences, selectedId]
  );

  if (evidences.length === 0) {
    return <div className="text-sm text-zinc-400">아직 업로드된 증빙이 없습니다.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="text-xs text-zinc-500">썸네일을 클릭하면 상세가 표시됩니다.</div>
      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <div className="space-y-2">
          <div className="text-xs text-zinc-500">목록 ({evidences.length}개)</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-2">
            {evidences.map((evidence) => {
              const isSelected = evidence.id === selectedEvidence?.id;
              const metadata = evidence.metadataJson as any;
              const fileUrl = evidence.fileRef;

              return (
                <button
                  key={evidence.id}
                  type="button"
                  onClick={() => setSelectedId(evidence.id)}
                  className={`relative overflow-hidden rounded-lg border ${isSelected ? "border-white/40 ring-2 ring-white/20" : "border-white/10"} bg-zinc-950/40 p-1 text-left transition`}
                >
                  <div className="absolute left-2 top-2">
                    <Pill tone="neutral">{evidence.type}</Pill>
                  </div>
                  {fileUrl && evidence.type === "IMAGE" ? (
                    <img
                      src={fileUrl}
                      alt={metadata?.originalName ?? "증빙 이미지"}
                      className="h-28 w-full rounded-md object-cover"
                    />
                  ) : fileUrl && evidence.type === "VIDEO" ? (
                    <video
                      src={fileUrl}
                      className="h-28 w-full rounded-md object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <div className="flex h-28 items-center justify-center text-xs text-zinc-500">
                      미리보기 없음
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="neutral">{selectedEvidence?.type ?? "UNKNOWN"}</Pill>
            {selectedEvidence ? (
              <span className="text-xs text-zinc-500">
                {new Date(selectedEvidence.createdAt).toLocaleString("ko-KR")}
              </span>
            ) : null}
          </div>
          <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-3">
            {(() => {
              const evidence = selectedEvidence;
              if (!evidence) return null;
              const metadata = evidence.metadataJson as any;
              const fileUrl = evidence.fileRef;

              return (
                <div className="space-y-3">
                  {metadata?.originalName ? (
                    <div className="text-xs text-zinc-400">{metadata.originalName}</div>
                  ) : null}
                  {fileUrl && evidence.type === "IMAGE" ? (
                    <img
                      src={fileUrl}
                      alt={metadata?.originalName ?? "증빙 이미지"}
                      className="max-w-full h-auto rounded-lg border border-white/10"
                      style={{ maxHeight: "360px" }}
                    />
                  ) : fileUrl && evidence.type === "VIDEO" ? (
                    <video
                      src={fileUrl}
                      controls
                      className="max-w-full h-auto rounded-lg border border-white/10"
                      style={{ maxHeight: "360px" }}
                    />
                  ) : (
                    <div className="text-sm text-zinc-400">미리볼 수 없는 파일입니다.</div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
