import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Panel, HudLabel, StatusDot } from "@/components/hey/primitives";

/* ── Metric Card ─────────────────────────────────── */

export function MetricCard({
  label,
  value,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <Panel interactive className="flex flex-col gap-3 p-5">
      <span className="flex items-center justify-between">
        <HudLabel>{label}</HudLabel>
        <Icon className="size-4 text-primary" strokeWidth={1.5} />
      </span>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      {trend && (
        <span
          className={cn(
            "text-xs font-medium",
            trend === "up" && "text-success",
            trend === "down" && "text-destructive",
            trend === "neutral" && "text-muted-foreground",
          )}
        >
          {trend === "up" && "↑ "}
          {trend === "down" && "↓ "}
          {trend === "neutral" && "— "}
          {trend === "up" ? "Active" : trend === "down" ? "Below baseline" : "Stable"}
        </span>
      )}
    </Panel>
  );
}

/* ── Activity Item ────────────────────────────────── */

export function ActivityItem({
  time,
  title,
  description,
  icon: Icon,
}: {
  time: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
}) {
  return (
    <li className="flex items-start gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface/40">
        {Icon ? (
          <Icon className="size-3.5 text-primary" strokeWidth={1.5} />
        ) : (
          <span className="size-1.5 rounded-full bg-primary/60" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <span className="hud-label shrink-0 pt-0.5">{time}</span>
    </li>
  );
}

/* ── Status Card ──────────────────────────────────── */

export function StatusCard({
  label,
  value,
  tone = "online",
}: {
  label: string;
  value: string;
  tone?: "online" | "idle" | "offline";
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
      <StatusDot label={label} tone={tone} />
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

/* ── Section Panel ────────────────────────────────── */

export function SectionPanel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Panel className={cn("flex flex-col gap-5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </Panel>
  );
}

/* ── Quick Action ─────────────────────────────────── */

export function QuickAction({
  icon: Icon,
  label,
  description,
  href,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  href?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-start gap-4 rounded-xl border border-border bg-surface/30 p-4 text-left transition-colors hover:border-primary/30 hover:bg-surface/50"
      {...(href ? {} : {})}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-surface/60 text-primary transition-colors group-hover:border-primary/30">
        <Icon className="size-4.5" strokeWidth={1.5} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}
