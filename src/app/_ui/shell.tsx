import type { ReactNode } from "react";
import { cn } from "@/app/_ui/cn";

export function PageHeader(props: {
  eyebrow?: string;
  title: string;
  description?: string;
  right?: ReactNode;
}) {
  return (
    <header className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
      <div className="space-y-2">
        {props.eyebrow ? (
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
            {props.eyebrow}
          </div>
        ) : null}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
            {props.title}
          </h1>
          {props.description ? <p className="text-sm text-text-subtle leading-relaxed">{props.description}</p> : null}
        </div>
      </div>
      {props.right ? <div className="shrink-0 sm:justify-self-end">{props.right}</div> : null}
    </header>
  );
}

const sizeToClass: Record<NonNullable<PageShellProps["size"]>, string> = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl"
};

export type PageShellProps = {
  size?: "sm" | "md" | "lg" | "xl";
  header?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function PageShell(props: PageShellProps) {
  const sizeClass = sizeToClass[props.size ?? "xl"];
  return (
    <main className={cn("space-y-10", props.className)}>
      <div className={cn("mx-auto w-full", sizeClass)}>{props.header}</div>
      <div className={cn("mx-auto w-full space-y-6", sizeClass)}>{props.children}</div>
    </main>
  );
}


