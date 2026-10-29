import type { LucideIcon } from "lucide-react";
import { Panel } from "@/components/hey/primitives";

export function FeatureCard({
  icon: Icon,
  title,
  description,
  meta,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  meta?: string;
}) {
  return (
    <Panel interactive className="flex h-full flex-col gap-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-surface/60 text-primary">
        <Icon className="size-5" strokeWidth={1.5} />
      </span>
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {meta && <p className="hud-label mt-auto pt-2">{meta}</p>}
    </Panel>
  );
}

export function StepCard({
  index,
  title,
  description,
}: {
  index: string;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative flex flex-col gap-3 border-t border-border pt-6 transition-colors hover:border-primary/40">
      <span className="font-mono text-sm text-primary">{index}</span>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
