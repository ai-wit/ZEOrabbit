import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { forwardRef } from "react";
import Link from "next/link";
import { cn } from "@/app/_ui/cn";

export function Card(props: ComponentPropsWithoutRef<"div"> & { children: ReactNode }) {
  return (
    <div
      {...props}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-surface shadow-sm",
        props.className
      )}
    >
      {props.children}
    </div>
  );
}

export function CardHeader(props: { title: string; description?: string; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-6 py-5">
      <div className="space-y-1">
        <div className="text-sm font-semibold text-text">{props.title}</div>
        {props.description ? <div className="text-sm text-text-subtle">{props.description}</div> : null}
      </div>
      {props.right ? <div className="shrink-0">{props.right}</div> : null}
    </div>
  );
}

export function CardBody(props: { children: ReactNode; className?: string }) {
  return <div className={cn("px-6 py-5", props.className)}>{props.children}</div>;
}

export function DividerList(props: { children: ReactNode }) {
  return <div className="divide-y divide-border">{props.children}</div>;
}

export function EmptyState(props: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="px-6 py-12">
      <div className="text-sm font-semibold text-text">{props.title}</div>
      {props.description ? <div className="mt-1 text-sm text-text-subtle">{props.description}</div> : null}
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
      ? "border-indigo-200 bg-indigo-50 text-indigo-700"
      : props.tone === "emerald"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : props.tone === "cyan"
          ? "border-cyan-200 bg-cyan-50 text-cyan-700"
          : props.tone === "red"
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-border bg-surface-muted text-text-subtle";

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
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const variant =
    props.variant === "primary"
      ? "bg-primary text-primary-foreground shadow-[0_10px_20px_-12px_rgba(15,23,42,0.3)] hover:bg-primary/90"
      : props.variant === "danger"
        ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
        : "border border-border bg-surface text-text hover:bg-surface-strong";

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
      ? "bg-primary text-primary-foreground shadow-[0_10px_20px_-12px_rgba(15,23,42,0.3)] hover:bg-primary/90"
      : "border border-border bg-surface text-text hover:bg-surface-strong";
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
    <label htmlFor={props.htmlFor} className="text-sm font-semibold text-text-muted">
      {props.children}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { className?: string }>(
  function Input(props, ref) {
    return (
      <input
        ref={ref}
        {...props}
        style={
          props.type === "date"
            ? {
                colorScheme: "light",
                ...props.style,
              }
            : props.style
        }
        className={cn(
          "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none placeholder:text-text-subtle focus:border-ring/50 focus:ring-2 focus:ring-ring/20",
          props.className
        )}
      />
    );
  }
);

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
      {props.label && <label className="text-sm font-semibold text-text-muted">{props.label}</label>}
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
  id?: string;
  className?: string;
}) {
  return (
    <div className="space-y-2">
      {props.label && <label className="text-sm font-semibold text-text-muted">{props.label}</label>}
      <textarea
        id={props.id}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        rows={props.rows || 3}
        required={props.required}
        className={cn(
          "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none placeholder:text-text-subtle focus:border-ring/50 focus:ring-2 focus:ring-ring/20",
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
        "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-ring/50 focus:ring-2 focus:ring-ring/20",
        props.className
      )}
    />
  );
}

export function Hint(props: { children: ReactNode }) {
  return <div className="text-xs text-text-subtle">{props.children}</div>;
}

export function Callout(props: {
  tone?: "info" | "warning";
  title: string;
  children?: ReactNode;
}) {
  const tone =
    props.tone === "warning"
      ? "border-yellow-200 bg-yellow-50 text-yellow-800"
      : "border-cyan-200 bg-cyan-50 text-cyan-700";

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
          <div className="shrink-0 whitespace-nowrap text-xs font-semibold tracking-wide text-text-subtle">{props.title}</div>
          {props.right ? <div className="shrink-0">{props.right}</div> : null}
        </div>
        {props.chart ? <div className="flex w-full justify-center">{props.chart}</div> : null}
        <div className="text-2xl font-semibold tracking-tight text-text">{props.value}</div>
        {props.hint ? <div className="text-xs text-text-subtle">{props.hint}</div> : null}
      </CardBody>
    </Card>
  );
}

export function KeyValueRow(props: { k: ReactNode; v: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="text-text-subtle">{props.k}</div>
      <div className="font-semibold text-text">{props.v}</div>
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


