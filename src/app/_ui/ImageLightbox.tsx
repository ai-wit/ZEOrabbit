"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Point = { x: number; y: number };

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function isModifiedWheel(e: WheelEvent): boolean {
  return e.ctrlKey || e.metaKey || e.shiftKey || e.altKey;
}

export function ImageLightbox(props: {
  src: string;
  label?: string;
  trigger?: ReactNode;
  className?: string;
}) {
  const label = props.label ?? "원본 보기";
  const [open, setOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ p: Point; o: Point } | null>(null);

  const close = useCallback(() => setOpen(false), []);
  const openModal = useCallback(() => setOpen(true), []);

  const fitScale = useMemo(() => {
    const el = containerRef.current;
    if (!el || !natural) return 1;
    const rect = el.getBoundingClientRect();
    const pad = 24 * 2; // px
    const w = Math.max(1, rect.width - pad);
    const h = Math.max(1, rect.height - pad);
    return clamp(Math.min(w / natural.w, h / natural.h), 0.05, 8);
  }, [natural, open]);

  const reset = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const fit = useCallback(() => {
    setScale(fitScale);
    setOffset({ x: 0, y: 0 });
  }, [fitScale]);

  const zoomBy = useCallback((delta: number) => {
    setScale((s) => clamp(s + delta, 0.1, 8));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    // Start in "fit" mode for best UX.
    fit();
  }, [open, fit]);

  useEffect(() => {
    if (!open) return;
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      // Prevent page scroll while interacting with the viewer.
      if (isModifiedWheel(e)) return;
      e.preventDefault();
      const dir = e.deltaY > 0 ? -1 : 1;
      zoomBy(dir * 0.12);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel as any);
  }, [open, zoomBy]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    dragStart.current = { p: { x: e.clientX, y: e.clientY }, o: offset };
  }, [offset]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.p.x;
    const dy = e.clientY - dragStart.current.p.y;
    setOffset({ x: dragStart.current.o.x + dx, y: dragStart.current.o.y + dy });
  }, [dragging]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setDragging(false);
    dragStart.current = null;
  }, []);

  return (
    <>
      {props.trigger ? (
        <button type="button" onClick={openModal} className={props.className ?? "block w-full"}>
          {props.trigger}
        </button>
      ) : (
        <button
          type="button"
          onClick={openModal}
          className={props.className ?? "text-xs font-semibold text-cyan-200 hover:text-cyan-100"}
        >
          {label}
        </button>
      )}

      {open ? (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="원본 이미지 뷰어"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="mx-auto flex h-full w-full max-w-6xl flex-col px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3">
              <div className="text-sm font-semibold text-zinc-50">원본 보기</div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => zoomBy(0.15)}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-white/[0.07]"
                >
                  확대
                </button>
                <button
                  type="button"
                  onClick={() => zoomBy(-0.15)}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-white/[0.07]"
                >
                  축소
                </button>
                <button
                  type="button"
                  onClick={fit}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-white/[0.07]"
                >
                  맞춤
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-white/[0.07]"
                >
                  원본
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-100 hover:bg-red-500/15"
                >
                  닫기
                </button>
              </div>
            </div>

            <div
              ref={containerRef}
              className="mt-3 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/60"
            >
              <div
                className="relative h-full w-full"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                style={{ cursor: dragging ? "grabbing" : "grab", touchAction: "none" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={props.src}
                  alt="evidence-original"
                  draggable={false}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    setNatural({ w: img.naturalWidth, h: img.naturalHeight });
                  }}
                  className="absolute left-1/2 top-1/2 max-h-none max-w-none select-none"
                  style={{
                    transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
                    transformOrigin: "center"
                  }}
                />
              </div>
            </div>
            <div className="mt-2 text-xs text-zinc-400">
              드래그로 이동 · 휠로 확대/축소 · ESC로 닫기
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}


