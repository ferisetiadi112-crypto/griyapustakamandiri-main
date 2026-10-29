import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <span aria-hidden className="relative grid size-8 shrink-0 place-items-center">
        <span className="absolute inset-0 rounded-full border border-primary/50" />
        <span className="absolute inset-1.5 rounded-full border border-border-strong" />
        <span className="size-1.5 rounded-full bg-primary" />
      </span>
      <span className="truncate font-display text-lg font-bold tracking-tight">
        HEY<span className="text-primary">5050</span>
      </span>
    </span>
  );
}
