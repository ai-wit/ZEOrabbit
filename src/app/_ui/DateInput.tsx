"use client";

import { useCallback, useRef } from "react";
import { cn } from "@/app/_ui/cn";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { className?: string };

export function DateInput(props: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openPicker = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;

    // Prefer the native picker API when available (Chromium).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyEl = el as any;
    if (typeof anyEl.showPicker === "function") {
      try {
        anyEl.showPicker();
        return;
      } catch {
        // fall through
      }
    }

    // Fallback: focus + click often opens the picker on Safari.
    el.focus();
    el.click();
  }, []);

  return (
    <div className="relative">
      <input
        {...props}
        ref={inputRef}
        type="date"
        className={cn(
          "zeo-date-input w-full rounded-xl border border-border bg-surface px-3 py-2 pr-11 text-sm text-text outline-none placeholder:text-text-subtle focus:border-ring/50 focus:ring-2 focus:ring-ring/20",
          props.className
        )}
      />
      <button
        type="button"
        onMouseDown={(e) => {
          // Prevent losing focus before opening.
          e.preventDefault();
          openPicker();
        }}
        onClick={(e) => {
          e.preventDefault();
          openPicker();
        }}
        aria-label="달력 열기"
        className="absolute inset-y-0 right-2 my-1 inline-flex w-9 items-center justify-center rounded-lg border border-border bg-surface-muted text-text transition hover:bg-surface-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
          <path d="M8 2v4M16 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}


