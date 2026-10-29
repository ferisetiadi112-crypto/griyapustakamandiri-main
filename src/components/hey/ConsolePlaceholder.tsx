import { Panel, HudChip } from "@/components/hey/primitives";

/** Visual placeholder for console modules that have no functionality yet. */
export function ConsolePlaceholder({ module }: { module: string }) {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Panel className="lg:col-span-2 flex min-h-64 flex-col justify-between gap-6">
        <HudChip>Module · {module}</HudChip>
        <div>
          <h2 className="text-xl font-semibold">Interface reserved</h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
            The {module.toLowerCase()} module is part of the Griya Pustaka Mandiri console architecture. Its
            layout is in place; the underlying system comes online in a later phase.
          </p>
        </div>
        <div aria-hidden className="grid gap-2">
          {[68, 44, 82].map((w) => (
            <span
              key={w}
              className="block h-2 rounded-full bg-secondary"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
      </Panel>
      <Panel className="flex flex-col gap-4">
        <HudChip>Status</HudChip>
        <dl className="grid gap-4 text-sm">
          {[
            ["Phase", "Foundation"],
            ["Backend", "Not connected"],
            ["Interface", "Ready"],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
              <dt className="hud-label">{k}</dt>
              <dd className="truncate">{v}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    </div>
  );
}
