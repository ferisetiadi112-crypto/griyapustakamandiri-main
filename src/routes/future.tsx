import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHero, SiteLayout } from "@/components/hey/SiteLayout";
import { HudChip, HudLabel, Panel, SectionHeading } from "@/components/hey/primitives";
import planet from "@/assets/planet-portal.jpg";

export const Route = createFileRoute("/future")({
  head: () => ({
    meta: [
      { title: "The Future — Griya Pustaka Mandiri in 5050" },
      {
        name: "description",
        content:
          "A long-horizon view of intelligent technology: how Griya Pustaka Mandiri imagines creation, automation and human-computer interaction evolving toward the year 5050.",
      },
      { property: "og:title", content: "The Future — Griya Pustaka Mandiri" },
      {
        property: "og:description",
        content: "A long-horizon view of technology, automation and human-computer interaction.",
      },
    ],
  }),
  component: Future,
});

const HORIZONS = [
  {
    era: "Near Horizon",
    title: "Connected workspaces",
    text: "Tools stop living in isolation. Creation, distribution and automation share one state.",
  },
  {
    era: "Mid Horizon",
    title: "Ambient intelligence",
    text: "Assistance becomes contextual and quiet — present when useful, invisible otherwise.",
  },
  {
    era: "Far Horizon",
    title: "Autonomous operations",
    text: "Systems run continuous work while humans set direction, constraints and taste.",
  },
  {
    era: "Year 5050",
    title: "Human + technology",
    text: "Interfaces dissolve into environments. Intent, not operation, becomes the input.",
  },
];

function Future() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Future · Long Horizon"
        title="Imagine technology in 5050"
        description="Griya Pustaka Mandiri treats the far future as a design constraint. If a decision would not survive a thousand years of iteration, it probably should not be a foundation."
      />

      <section className="section">
        <div className="shell grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:items-center">
          <div className="relative overflow-hidden rounded-3xl border border-border">
            <img
              src={planet}
              alt="A distant ringed planet in deep space"
              loading="lazy"
              width={1024}
              height={1536}
              className="h-[26rem] w-full object-cover md:h-[34rem]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-2 p-6">
              <HudChip tone="active">Year 5050</HudChip>
              <HudChip>Next Generation</HudChip>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <SectionHeading
              eyebrow="Trajectory"
              title="Four horizons"
              description="A believable future is reached in stages, not in a single leap."
            />
            {HORIZONS.map((h) => (
              <Panel key={h.era} interactive className="flex flex-col gap-2 p-5">
                <HudLabel>{h.era}</HudLabel>
                <h3 className="text-lg font-semibold">{h.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{h.text}</p>
              </Panel>
            ))}
          </div>
        </div>
      </section>

      <section className="section pt-0">
        <div className="shell">
          <Panel className="flex flex-col items-start gap-6 p-8 md:flex-row md:items-center md:justify-between md:p-10">
            <SectionHeading
              title="Join the next generation"
              description="Access the Griya Pustaka Mandiri console and follow the platform as it comes online."
            />
            <Button asChild variant="hero" size="lg">
              <Link to="/login">
                Get Started <ArrowRight />
              </Link>
            </Button>
          </Panel>
        </div>
      </section>
    </SiteLayout>
  );
}
