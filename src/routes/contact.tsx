import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, MapPin, Radio } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHero, SiteLayout } from "@/components/hey/SiteLayout";
import { HudLabel, Panel, StatusDot } from "@/components/hey/primitives";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Griya Pustaka Mandiri — Open a Channel" },
      {
        name: "description",
        content:
          "Get in touch with the Griya Pustaka Mandiri team about the platform, partnerships, integrations or early access to the console.",
      },
      { property: "og:title", content: "Contact Griya Pustaka Mandiri" },
      {
        property: "og:description",
        content: "Open a channel with the Griya Pustaka Mandiri team.",
      },
    ],
  }),
  component: Contact,
});

const CHANNELS = [
  { icon: Mail, label: "General", value: "Informasi kontak penerbit segera tersedia" },
  { icon: Radio, label: "Partnerships", value: "Kerja sama penerbitan buku" },
  { icon: MapPin, label: "Station", value: "Orbital Systems Division · Sector 5050" },
];

function Contact() {
  const [sent, setSent] = useState(false);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Contact"
        title="Open a channel"
        description="Questions about the platform, partnerships or early console access — send a transmission and the team will respond."
      />

      <section className="section">
        <div className="shell grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          <Panel className="p-6 md:p-8">
            <form
              className="flex flex-col gap-5"
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" placeholder="Ada Lovelace" required />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" placeholder="you@domain.com" required />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" name="subject" placeholder="Platform enquiry" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" name="message" rows={6} placeholder="Tell us what you're building." required />
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <Button type="submit" variant="hero" size="lg">
                  Send Transmission
                </Button>
                {sent && (
                  <p className="text-sm text-primary" role="status">
                    Transmission queued — this is a visual placeholder.
                  </p>
                )}
              </div>
            </form>
          </Panel>

          <div className="flex flex-col gap-5">
            {CHANNELS.map((channel) => (
              <Panel key={channel.label} interactive className="flex items-start gap-4 p-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-surface/60 text-primary">
                  <channel.icon className="size-4.5" strokeWidth={1.5} />
                </span>
                <div className="min-w-0">
                  <HudLabel>{channel.label}</HudLabel>
                  <p className="mt-1 truncate text-sm">{channel.value}</p>
                </div>
              </Panel>
            ))}
            <Panel className="flex items-center justify-between p-5">
              <HudLabel>Response window</HudLabel>
              <StatusDot label="1–2 days" tone="idle" />
            </Panel>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
