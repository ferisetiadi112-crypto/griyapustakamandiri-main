import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Small monospaced interface-metadata label. */
export function HudLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("hud-label", className)}>{children}</span>;
}

/** Bordered chip used for section eyebrows and status metadata. */
export function HudChip({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: "default" | "active";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "hud-label inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5",
        tone === "active" && "border-primary/40 text-primary",
        className,
      )}
    >
      {tone === "active" && (
        <span className="size-1.5 shrink-0 animate-pulse-soft rounded-full bg-primary" />
      )}
      {children}
    </span>
  );
}

/** Status indicator dot + text. */
export function StatusDot({
  label,
  tone = "online",
}: {
  label: string;
  tone?: "online" | "idle" | "offline";
}) {
  const color =
    tone === "online" ? "bg-success" : tone === "idle" ? "bg-primary" : "bg-muted-foreground";
  return (
    <span className="hud-label inline-flex items-center gap-2">
      <span className={cn("size-1.5 rounded-full animate-pulse-soft", color)} />
      {label}
    </span>
  );
}

/** Core surface: subtle transparency, thin border, restrained shadow. */
export function Panel({
  children,
  className,
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div className={cn("panel p-6", interactive && "panel-hover", className)}>{children}</div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      {eyebrow && <HudChip>{eyebrow}</HudChip>}
      <h2 className="text-balance text-3xl font-semibold leading-tight sm:text-4xl md:text-[2.75rem]">
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            "max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground",
            align === "center" && "mx-auto",
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}

/** Thin decorative orbital rings, used behind hero and login visuals. */
export function OrbitRings({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 grid place-items-center", className)}>
      <div className="animate-orbit">
        <div className="size-[36rem] rounded-full border border-border-strong/60 md:size-[52rem]" />
      </div>
      <div className="absolute animate-orbit [animation-direction:reverse]">
        <div className="size-[24rem] rounded-full border border-primary/15 md:size-[36rem]" />
      </div>
      <div className="absolute size-[14rem] rounded-full border border-border md:size-[22rem]" />
    </div>
  );
}
