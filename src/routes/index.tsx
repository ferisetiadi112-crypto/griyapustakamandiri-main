import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  Cpu,
  Layers,
  Music2,
  Orbit,
  Puzzle,
  Sparkles,
  Workflow,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteLayout } from "@/components/hey/SiteLayout";
import { FeatureCard, StepCard } from "@/components/hey/FeatureCard";
import { HudChip, HudLabel, Panel, SectionHeading, OrbitRings } from "@/components/hey/primitives";
import horizon from "@/assets/orbital-horizon.jpg";
import vision from "@/assets/vision-5050.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hey5050 — The Future Starts Here" },
      {
        name: "description",
        content:
          "Hey5050 explores the next generation of intelligent technology, automation and digital creation — a platform built for the world beyond today.",
      },
      { property: "og:title", content: "Hey5050 — The Future Starts Here" },
      {
        property: "og:description",
        content:
          "A futuristic technology platform for intelligent automation, digital creation and connected systems.",
      },
    ],
  }),
  component: Home,
});

const PILLARS = [
  {
    icon: Cpu,
    title: "Intelligent Technology",
    description:
      "Systems that understand context, adapt to intent and support human decisions instead of replacing them.",
    meta: "Layer 01",
  },
  {
    icon: Workflow,
    title: "Automation",
    description:
      "Reliable, observable workflows that carry repetitive operations quietly in the background.",
    meta: "Layer 02",
  },
  {
    icon: Sparkles,
    title: "Digital Creation",
    description:
      "A creative surface where ideas become publishable output across every connected channel.",
    meta: "Layer 03",
  },
  {
    icon: Layers,
    title: "Connected Platforms",
    description:
      "One control surface for the tools, networks and services a creator or company already depends on.",
    meta: "Layer 04",
  },
];

const STEPS = [
  {
    index: "01",
    title: "Connect",
    description: "Link the digital tools and platforms you already use into a single environment.",
  },
  {
    index: "02",
    title: "Create",
    description: "Produce and organise content inside a calm, structured creative workspace.",
  },
  {
    index: "03",
    title: "Automate",
    description: "Hand repeated operations to workflows that run predictably and transparently.",
  },
  {
    index: "04",
    title: "Evolve",
    description: "Adopt future capabilities progressively, at the pace your team is ready for.",
  },
];

const INTEGRATIONS = [
  {
    icon: Music2,
    title: "TikTok",
    description: "Connect a creator account to plan and organise short-form content.",
    meta: "Integration",
  },
  {
    icon: Orbit,
    title: "Future Platforms",
    description: "Prepared for networks and protocols that do not exist yet.",
    meta: "Planned",
  },
  {
    icon: Puzzle,
    title: "Creative Tools",
    description: "Bring design, media and writing tools into one connected pipeline.",
    meta: "Planned",
  },
  {
    icon: Bot,
    title: "Automation Systems",
    description: "Attach schedulers, agents and event triggers to your workflows.",
    meta: "Planned",
  },
];

const TELEMETRY = [
  { label: "Year", value: "5050" },
  { label: "Status", value: "System Online" },
  { label: "Model", value: "Human + Technology" },
  { label: "Cycle", value: "Next Generation" },
];

function Home() {
  return (
    <SiteLayout>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <img
            src={horizon}
            alt=""
            width={1920}
            height={1088}
            className="absolute inset-x-0 bottom-0 h-[70%] w-full object-cover object-top opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/40 to-background" />
          <OrbitRings className="opacity-40" />
        </div>

        <div className="shell relative py-24 md:py-36">
          <div className="mx-auto flex max-w-3xl animate-rise flex-col items-center text-center">
            <HudChip tone="active">Orbital Station · Year 5050</HudChip>
            <h1 className="mt-8 text-balance font-display text-5xl font-bold leading-[0.95] sm:text-6xl md:text-7xl lg:text-8xl">
              <span className="block tracking-tight text-gradient">HEY5050</span>
              <span className="mt-4 block text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
                The Future Starts Here.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
              Exploring the next generation of intelligent technology, automation, and digital
              creation.
            </p>
            <div className="mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button asChild variant="hero" size="lg">
                <Link to="/future">
                  Explore the Future <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="glass" size="lg">
                <Link to="/how-it-works">How It Works</Link>
              </Button>
            </div>
          </div>

          <dl className="mx-auto mt-20 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-4">
            {TELEMETRY.map((item) => (
              <div key={item.label} className="bg-background/70 px-5 py-6 backdrop-blur-md">
                <dt className="hud-label">{item.label}</dt>
                <dd className="mt-2 text-sm font-medium">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* FUTURE TECHNOLOGY */}
      <section className="section relative">
        <div className="shell">
          <SectionHeading
            eyebrow="Philosophy"
            title="Built for the World Beyond Today"
            description="Hey5050 studies how technology, automation, artificial intelligence and digital creativity can evolve together — and turns that research into a platform people can actually use now."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((pillar) => (
              <FeatureCard key={pillar.title} {...pillar} />
            ))}
          </div>
        </div>
      </section>

      {/* 5050 VISION */}
      <section className="relative">
        <div className="shell">
          <div className="relative overflow-hidden rounded-3xl border border-border">
            <img
              src={vision}
              alt="A spacecraft crossing a planetary horizon in deep space"
              loading="lazy"
              width={1920}
              height={912}
              className="h-[26rem] w-full object-cover md:h-[34rem]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-background/10" />
            <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-10">
              <div className="flex flex-wrap gap-3">
                <HudChip tone="active">Year 5050</HudChip>
                <HudChip>System Online</HudChip>
              </div>
              <div className="max-w-xl">
                <h2 className="text-balance text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
                  Imagine Technology in 5050
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
                  An environment where intelligent systems, human intent and creative work operate
                  as one continuous surface.
                </p>
                <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2">
                  <HudLabel>Human + Technology</HudLabel>
                  <HudLabel>Next Generation</HudLabel>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section">
        <div className="shell">
          <SectionHeading
            eyebrow="Operating Model"
            title="Four movements, one ecosystem"
            description="Hey5050 is designed as an ecosystem where people connect their digital tools, create content, automate workflows and progressively adopt future technologies."
          />
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => (
              <StepCard key={step.index} {...step} />
            ))}
          </div>
        </div>
      </section>

      {/* INTEGRATIONS */}
      <section className="section pt-0">
        <div className="shell">
          <SectionHeading
            eyebrow="Integrations"
            title="Connected to the Digital World"
            description="The platform is built to speak to the systems around it. Every integration is a capability — never the identity of Hey5050."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {INTEGRATIONS.map((item) => (
              <FeatureCard key={item.title} {...item} />
            ))}
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Platform connections are managed inside the authenticated console.{" "}
            <Link to="/integrations/tiktok" className="text-primary hover:underline">
              Read about the TikTok integration
            </Link>
            .
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="section pt-0">
        <div className="shell">
          <Panel className="relative overflow-hidden p-8 text-center md:p-16">
            <div aria-hidden className="absolute inset-0 atmosphere opacity-70" />
            <div className="relative mx-auto flex max-w-2xl flex-col items-center">
              <HudChip tone="active">Boarding Open</HudChip>
              <h2 className="mt-6 text-balance text-3xl font-semibold sm:text-4xl">
                Step into the next generation
              </h2>
              <p className="mt-4 text-pretty text-muted-foreground">
                Create an account and explore the Hey5050 command console.
              </p>
              <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Button asChild variant="hero" size="lg">
                  <Link to="/login">
                    Get Started <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="glass" size="lg">
                  <Link to="/contact">Contact Us</Link>
                </Button>
              </div>
            </div>
          </Panel>
        </div>
      </section>
    </SiteLayout>
  );
}
