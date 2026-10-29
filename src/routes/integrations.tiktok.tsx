import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, FolderKanban, Music2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHero, SiteLayout } from "@/components/hey/SiteLayout";
import { FeatureCard } from "@/components/hey/FeatureCard";
import { HudChip, Panel, SectionHeading } from "@/components/hey/primitives";

export const Route = createFileRoute("/integrations/tiktok")({
  head: () => ({
    meta: [
      { title: "TikTok Integration — One Connection Inside Griya Pustaka Mandiri" },
      {
        name: "description",
        content:
          "How the TikTok integration fits inside Griya Pustaka Mandiri: one optional connection within a broader platform for creation, automation and connected systems.",
      },
      { property: "og:title", content: "TikTok Integration — Griya Pustaka Mandiri" },
      {
        property: "og:description",
        content: "TikTok is one integration capability inside the Griya Pustaka Mandiri platform, not its identity.",
      },
    ],
  }),
  component: TikTokIntegration,
});

const POINTS = [
  {
    icon: Music2,
    title: "Account Connection",
    description: "Link a creator account from inside the console — never from the public site.",
    meta: "Planned",
  },
  {
    icon: FolderKanban,
    title: "Content Organisation",
    description: "Prepare and organise short-form content alongside every other channel.",
    meta: "Planned",
  },
  {
    icon: CalendarClock,
    title: "Scheduling",
    description: "Attach publishing routines to the same automation core as the rest of the platform.",
    meta: "Planned",
  },
  {
    icon: ShieldCheck,
    title: "Explicit Permissions",
    description: "Scopes are reviewable, revocable and shown in plain language before you approve.",
    meta: "Planned",
  },
];

function TikTokIntegration() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Integration · Optional Module"
        title="TikTok is one connection, not the platform"
        description="Griya Pustaka Mandiri is a technology platform first. The TikTok integration is an optional module that lives inside the authenticated console for accounts that want it."
      />

      <section className="section">
        <div className="shell">
          <Panel className="flex flex-col gap-4 p-6 md:p-8">
            <HudChip>Status · Not yet available</HudChip>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              This page describes the intended shape of the integration. No connection, data access
              or publishing capability is active in the current phase of the platform.
            </p>
          </Panel>

          <SectionHeading
            className="mt-16"
            eyebrow="Scope"
            title="What the module is intended to cover"
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {POINTS.map((point) => (
              <FeatureCard key={point.title} {...point} />
            ))}
          </div>

          <Panel className="mt-16 flex flex-col items-start gap-6 p-8 md:flex-row md:items-center md:justify-between">
            <SectionHeading
              title="Connections live in the console"
              description="Platform connections are managed under Integrations inside the authenticated dashboard."
            />
            <Button asChild variant="glass" size="lg">
              <Link to="/login">Console Access</Link>
            </Button>
          </Panel>
        </div>
      </section>
    </SiteLayout>
  );
}
