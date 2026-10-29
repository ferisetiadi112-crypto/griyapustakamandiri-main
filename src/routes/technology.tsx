import { createFileRoute } from "@tanstack/react-router";
import { Boxes, CircuitBoard, Gauge, Network, Radar, ServerCog } from "lucide-react";

import { PageHero, SiteLayout } from "@/components/hey/SiteLayout";
import { FeatureCard } from "@/components/hey/FeatureCard";
import { HudLabel, Panel, SectionHeading } from "@/components/hey/primitives";

export const Route = createFileRoute("/technology")({
  head: () => ({
    meta: [
      { title: "Technology — The Griya Pustaka Mandiri Architecture" },
      {
        name: "description",
        content:
          "The Griya Pustaka Mandiri architecture: an intelligence layer, an automation core, a creation surface and a connection fabric, assembled into one command environment.",
      },
      { property: "og:title", content: "Technology — Griya Pustaka Mandiri" },
      {
        property: "og:description",
        content: "How the Griya Pustaka Mandiri platform is layered, from connection fabric to command surface.",
      },
    ],
  }),
  component: Technology,
});

const CAPABILITIES = [
  {
    icon: CircuitBoard,
    title: "Intelligence Layer",
    description: "Context-aware assistance that stays legible and reviewable at every step.",
    meta: "Layer 01",
  },
  {
    icon: ServerCog,
    title: "Automation Core",
    description: "Deterministic workflows with schedules, triggers and a complete activity trail.",
    meta: "Layer 02",
  },
  {
    icon: Boxes,
    title: "Creation Surface",
    description: "A structured workspace for drafting and organising digital output.",
    meta: "Layer 03",
  },
  {
    icon: Network,
    title: "Connection Fabric",
    description: "A uniform contract for docking external platforms and creative tools.",
    meta: "Layer 04",
  },
  {
    icon: Radar,
    title: "Observability",
    description: "System status, run history and health signals presented as first-class UI.",
    meta: "Layer 05",
  },
  {
    icon: Gauge,
    title: "Control & Safety",
    description: "Explicit permissions, reversible actions and human confirmation where it matters.",
    meta: "Layer 06",
  },
];

const STACK = [
  ["Command Surface", "Console, dashboards and controls the operator touches"],
  ["Creation & Automation", "Content workspace and workflow execution"],
  ["Intelligence", "Contextual reasoning and assistance"],
  ["Connection Fabric", "Uniform integration contracts"],
  ["Foundation", "Identity, telemetry, storage and security"],
];

function Technology() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Architecture"
        title="A layered system, engineered to stay understandable"
        description="Griya Pustaka Mandiri is assembled from independent layers. Each one can evolve without destabilising the others — which is what makes long-horizon technology practical."
      />

      <section className="section">
        <div className="shell">
          <SectionHeading eyebrow="Capabilities" title="What the platform is made of" />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((item) => (
              <FeatureCard key={item.title} {...item} />
            ))}
          </div>
        </div>
      </section>

      <section className="section pt-0">
        <div className="shell grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <SectionHeading
            eyebrow="Stack"
            title="From foundation to command surface"
            description="Every layer exposes a narrow, stable contract to the layer above it. New capability docks in at the right altitude instead of being bolted onto the interface."
          />
          <Panel className="flex flex-col gap-3 p-4 md:p-6">
            {STACK.map((row, i) => (
              <div
                key={row[0]}
                className="rounded-xl border border-border bg-surface/40 px-5 py-4 transition-colors hover:border-primary/35"
                style={{ marginInline: `${i * 4}px` }}
              >
                <HudLabel>{`0${STACK.length - i}`}</HudLabel>
                <p className="mt-1 text-sm font-semibold">{row[0]}</p>
                <p className="mt-1 text-sm text-muted-foreground">{row[1]}</p>
              </div>
            ))}
          </Panel>
        </div>
      </section>
    </SiteLayout>
  );
}
