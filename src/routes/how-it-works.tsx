import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHero, SiteLayout } from "@/components/hey/SiteLayout";
import { HudChip, HudLabel, Panel, SectionHeading } from "@/components/hey/primitives";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How Griya Pustaka Mandiri Works — Connect, Create, Automate, Evolve" },
      {
        name: "description",
        content:
          "Four movements define the Griya Pustaka Mandiri ecosystem: connect your tools, create content, automate workflows and progressively evolve with future technology.",
      },
      { property: "og:title", content: "How Griya Pustaka Mandiri Works" },
      {
        property: "og:description",
        content: "Connect, create, automate and evolve inside one futuristic operating environment.",
      },
    ],
  }),
  component: HowItWorks,
});

const STAGES = [
  {
    index: "01",
    title: "Connect",
    summary: "Bring your existing tools into one environment.",
    detail:
      "Platforms, creative tools and automation systems dock into a single console. Each connection is explicit, reviewable and reversible.",
    signals: ["Connection registry", "Permission review", "Status telemetry"],
  },
  {
    index: "02",
    title: "Create",
    summary: "Produce work in a calm, structured workspace.",
    detail:
      "Drafting, organising and preparing content happens in one place, with the same structure regardless of where the output will eventually travel.",
    signals: ["Unified drafts", "Structured assets", "Review states"],
  },
  {
    index: "03",
    title: "Automate",
    summary: "Let workflows carry the repetitive operations.",
    detail:
      "Schedules, triggers and routines run in the background with a clear activity trail so nothing happens invisibly.",
    signals: ["Triggers", "Schedules", "Activity trail"],
  },
  {
    index: "04",
    title: "Evolve",
    summary: "Adopt future capability at your own pace.",
    detail:
      "New intelligence and new platforms arrive as modules. Nothing is forced on the workspace before a team is ready for it.",
    signals: ["Modular capability", "Progressive rollout", "Long-term stability"],
  },
];

function HowItWorks() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Operating Model"
        title="Four movements, one continuous system"
        description="Griya Pustaka Mandiri is designed as an ecosystem rather than a single tool. Each stage below describes how the platform is intended to behave once the full system is online."
      />

      <section className="section">
        <div className="shell flex flex-col gap-5">
          {STAGES.map((stage) => (
            <Panel key={stage.index} interactive className="grid gap-6 md:grid-cols-[auto_1fr_auto] md:items-start md:p-8">
              <span className="font-mono text-2xl text-primary md:w-16">{stage.index}</span>
              <div className="flex min-w-0 flex-col gap-3">
                <h2 className="text-2xl font-semibold">{stage.title}</h2>
                <p className="text-sm font-medium text-foreground/90">{stage.summary}</p>
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {stage.detail}
                </p>
              </div>
              <ul className="flex flex-wrap gap-2 md:max-w-56 md:justify-end">
                {stage.signals.map((signal) => (
                  <li key={signal}>
                    <HudChip>{signal}</HudChip>
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
        </div>
      </section>

      <section className="section pt-0">
        <div className="shell">
          <Panel className="flex flex-col items-start gap-6 p-8 md:flex-row md:items-center md:justify-between md:p-10">
            <div>
              <HudLabel>Next</HudLabel>
              <SectionHeading
                title="See the technology behind it"
                className="mt-3"
                description="The architecture layer describes how these movements are assembled."
              />
            </div>
            <Button asChild variant="hero" size="lg">
              <Link to="/technology">
                Technology <ArrowRight />
              </Link>
            </Button>
          </Panel>
        </div>
      </section>
    </SiteLayout>
  );
}
