import { createFileRoute } from "@tanstack/react-router";
import { Compass, HeartHandshake, ShieldCheck, Telescope } from "lucide-react";

import { PageHero, SiteLayout } from "@/components/hey/SiteLayout";
import { FeatureCard } from "@/components/hey/FeatureCard";
import { Panel, SectionHeading, HudLabel } from "@/components/hey/primitives";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Griya Pustaka Mandiri — Technology from the future" },
      {
        name: "description",
        content:
          "Griya Pustaka Mandiri is a technology platform exploring how humans and intelligent systems work together — designed for the future, built for humans today.",
      },
      { property: "og:title", content: "About Griya Pustaka Mandiri" },
      {
        property: "og:description",
        content: "The philosophy and principles behind the Griya Pustaka Mandiri technology platform.",
      },
    ],
  }),
  component: About,
});

const VALUES = [
  {
    icon: Telescope,
    title: "Long Horizon",
    description: "We design for decades, not quarters. Every decision assumes a longer timeline.",
  },
  {
    icon: HeartHandshake,
    title: "Human First",
    description: "Intelligent systems should extend human judgement, never quietly replace it.",
  },
  {
    icon: ShieldCheck,
    title: "Trustworthy Systems",
    description: "Transparency, predictability and control are treated as product features.",
  },
  {
    icon: Compass,
    title: "Clarity Over Spectacle",
    description: "The future should be understandable. Clarity outranks decoration everywhere.",
  },
];

function About() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="About · Station Log"
        title="A platform built at the meeting point of humans and future technology"
        description="The name Griya Pustaka Mandiri is a greeting sent forward in time — a conversation between the people building today and the technology arriving tomorrow."
      />

      <section className="section">
        <div className="shell grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-start">
          <div className="flex flex-col gap-6">
            <SectionHeading
              eyebrow="Mission"
              title="Technology from the future, designed for humans today"
              description="Griya Pustaka Mandiri is building the foundation for future digital creation, intelligent automation and connected technology. We work on the parts of that future that can be made usable now, and shape the platform so tomorrow's capabilities can dock into it without redesign."
            />
            <p className="text-sm leading-relaxed text-muted-foreground">
              The platform is deliberately not defined by any single network or service. Individual
              integrations come and go; the operating environment around them is the product.
            </p>
          </div>
          <Panel className="flex flex-col gap-6">
            <HudLabel>Station Manifest</HudLabel>
            <dl className="grid gap-5">
              {[
                ["Designation", "Griya Pustaka Mandiri Orbital Platform"],
                ["Focus", "Intelligent systems · Automation · Creation"],
                ["Posture", "Platform-oriented, integration-agnostic"],
                ["Phase", "Foundation — visual architecture"],
              ].map(([k, v]) => (
                <div key={k} className="border-b border-border pb-4 last:border-0 last:pb-0">
                  <dt className="hud-label">{k}</dt>
                  <dd className="mt-1.5 text-sm">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      </section>

      <section className="section pt-0">
        <div className="shell">
          <SectionHeading eyebrow="Principles" title="How we build" />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((value) => (
              <FeatureCard key={value.title} {...value} />
            ))}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
