import type { ComponentPropsWithoutRef, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/app/_ui/cn";

export function Card(props: ComponentPropsWithoutRef<"div"> & { children: ReactNode }) {
  return (
    <div
      {...props}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_0_0_1px_rgba(255,255,255,0.03)]",
        props.className
      )}
    >
      {props.children}
    </div>
  );
}

export function CardHeader(props: { title: string; description?: string; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
      <div className="space-y-1">
        <div className="text-sm font-semibold text-zinc-50">{props.title}</div>
        {props.description ? <div className="text-sm text-zinc-400">{props.description}</div> : null}
      </div>
      {props.right ? <div className="shrink-0">{props.right}</div> : null}
    </div>
  );
}

export function CardBody(props: { children: ReactNode; className?: string }) {
  return <div className={cn("px-6 py-5", props.className)}>{props.children}</div>;
}

export function DividerList(props: { children: ReactNode }) {
  return <div className="divide-y divide-white/10">{props.children}</div>;
}

export function EmptyState(props: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="px-6 py-12">
      <div className="text-sm font-semibold text-zinc-100">{props.title}</div>
      {props.description ? <div className="mt-1 text-sm text-zinc-400">{props.description}</div> : null}
      {props.action ? <div className="mt-4">{props.action}</div> : null}
    </div>
  );
}

export function Pill(props: {
  children: ReactNode;
  tone?: "neutral" | "cyan" | "indigo" | "emerald" | "red";
}) {
  const tone =
    props.tone === "indigo"
      ? "border-indigo-400/20 bg-indigo-400/10 text-indigo-100"
      : props.tone === "emerald"
        ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
        : props.tone === "cyan"
          ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-100"
          : props.tone === "red"
            ? "border-red-400/20 bg-red-400/10 text-red-100"
            : "border-white/10 bg-white/5 text-zinc-200";

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", tone)}>
      {props.children}
    </span>
  );
}

export function Button(props: {
  children: ReactNode;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const variant =
    props.variant === "primary"
      ? "bg-gradient-to-r from-indigo-500 to-cyan-400 text-zinc-950 shadow-[0_10px_30px_-12px_rgba(34,211,238,0.45)] hover:opacity-95"
      : props.variant === "danger"
        ? "border border-red-500/25 bg-red-500/10 text-red-100 hover:bg-red-500/15"
        : "border border-white/10 bg-white/5 text-zinc-50 hover:bg-white/10";

  const size = props.size === "sm" ? "px-3 py-2 text-xs rounded-xl" : "px-4 py-2.5 text-sm rounded-xl";

  return (
    <button
      type={props.type ?? "button"}
      disabled={props.disabled}
      onClick={props.onClick}
      className={cn(
        "inline-flex items-center justify-center font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        size,
        variant,
        props.className
      )}
    >
      {props.children}
    </button>
  );
}

export function ButtonLink(props: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  size?: "sm" | "md";
  className?: string;
}) {
  const variant =
    props.variant === "primary"
      ? "bg-gradient-to-r from-indigo-500 to-cyan-400 text-zinc-950 shadow-[0_10px_30px_-12px_rgba(34,211,238,0.45)] hover:opacity-95"
      : "border border-white/10 bg-white/5 text-zinc-50 hover:bg-white/10";
  const size = props.size === "sm" ? "px-3 py-2 text-xs rounded-xl" : "px-4 py-2.5 text-sm rounded-xl";

  return (
    <Link
      href={props.href}
      className={cn("inline-flex items-center justify-center font-semibold transition", size, variant, props.className)}
    >
      {props.children}
    </Link>
  );
}

export function Label(props: { htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={props.htmlFor} className="text-sm font-semibold text-zinc-200">
      {props.children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/10",
        // Date input 전용 스타일링 - 달력 아이콘을 밝은 회색으로 변경해서 배경과 확실히 구분
        props.type === "date" && [
          "[&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-1.8 [&::-webkit-calendar-picker-indicator]:contrast-1.5 [&::-webkit-calendar-picker-indicator]:opacity-95 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:transition-opacity",
          // Firefox용 - 밝은 회색으로 변경
          "[&::-moz-calendar-picker-indicator]:filter [&::-moz-calendar-picker-indicator]:invert [&::-moz-calendar-picker-indicator]:brightness-1.8 [&::-moz-calendar-picker-indicator]:opacity-95 hover:[&::-moz-calendar-picker-indicator]:opacity-100 [&::-moz-calendar-picker-indicator]:transition-opacity"
        ],
        props.className
      )}
    />
  );
}

export function TextInput(props: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  min?: string;
  className?: string;
}) {
  return (
    <div className="space-y-2">
      {props.label && <label className="text-sm font-semibold text-zinc-200">{props.label}</label>}
      <Input
        type={props.type || "text"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        required={props.required}
        min={props.min}
        className={props.className}
      />
    </div>
  );
}

export function TextArea(props: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className="space-y-2">
      {props.label && <label className="text-sm font-semibold text-zinc-200">{props.label}</label>}
      <textarea
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        rows={props.rows || 3}
        required={props.required}
        className={cn(
          "w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/10",
          props.className
        )}
      />
    </div>
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { className?: string }) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/10",
        props.className
      )}
    />
  );
}

export function Hint(props: { children: ReactNode }) {
  return <div className="text-xs text-zinc-400">{props.children}</div>;
}

export function Callout(props: {
  tone?: "info" | "warning";
  title: string;
  children?: ReactNode;
}) {
  const tone =
    props.tone === "warning"
      ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-100"
      : "border-cyan-400/25 bg-cyan-400/10 text-cyan-100";

  return (
    <div className={cn("rounded-2xl border p-4", tone)}>
      <div className="text-sm font-semibold">{props.title}</div>
      {props.children ? <div className="mt-1 text-sm opacity-90">{props.children}</div> : null}
    </div>
  );
}

export function StatCard(props: {
  title: string;
  value: ReactNode;
  hint?: ReactNode;
  right?: ReactNode;
  chart?: ReactNode;
}) {
  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="shrink-0 whitespace-nowrap text-xs font-semibold tracking-wide text-zinc-300">{props.title}</div>
          {props.right ? <div className="shrink-0">{props.right}</div> : null}
        </div>
        {props.chart ? <div className="flex w-full justify-center">{props.chart}</div> : null}
        <div className="text-2xl font-semibold tracking-tight text-zinc-50">{props.value}</div>
        {props.hint ? <div className="text-xs text-zinc-400">{props.hint}</div> : null}
      </CardBody>
    </Card>
  );
}

export function KeyValueRow(props: { k: ReactNode; v: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="text-zinc-400">{props.k}</div>
      <div className="font-semibold text-zinc-100">{props.v}</div>
    </div>
  );
}

export function SparkBars(props: {
  values: number[];
  height?: number;
  width?: number;
  tone?: "cyan" | "indigo" | "emerald" | "red" | "neutral";
  ariaLabel?: string;
  className?: string;
}) {
  const width = props.width ?? 140;
  const height = props.height ?? 36;
  const values = props.values.length > 0 ? props.values : [0];
  const max = Math.max(1, ...values);
  const gap = 3;
  const bars = values.length;
  const barWidth = Math.max(2, Math.floor((width - gap * (bars - 1)) / bars));
  const color =
    props.tone === "indigo"
      ? "rgba(99,102,241,0.9)"
      : props.tone === "emerald"
        ? "rgba(52,211,153,0.9)"
        : props.tone === "red"
          ? "rgba(248,113,113,0.9)"
        : props.tone === "neutral"
          ? "rgba(161,161,170,0.6)"
          : "rgba(34,211,238,0.9)";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role={props.ariaLabel ? "img" : "presentation"}
      aria-label={props.ariaLabel}
      preserveAspectRatio="none"
      className={cn("block w-full", props.className)}
    >
      {values.map((v, i) => {
        const h = Math.max(2, Math.round((v / max) * (height - 2)));
        const x = i * (barWidth + gap);
        const y = height - h;
        return <rect key={i} x={x} y={y} width={barWidth} height={h} rx={3} fill={color} opacity={0.9} />;
      })}
    </svg>
  );
}


