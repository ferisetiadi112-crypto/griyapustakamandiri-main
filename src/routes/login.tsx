import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Globe, Music2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/hey/Logo";
import { Starfield } from "@/components/hey/Starfield";
import { HudChip, HudLabel, OrbitRings, StatusDot } from "@/components/hey/primitives";
import planet from "@/assets/planet-portal.jpg";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — Enter the Hey5050 Console" },
      {
        name: "description",
        content:
          "Sign in to the Hey5050 command console to connect your TikTok account.",
      },
      { property: "og:title", content: "Login — Hey5050" },
      { property: "og:description", content: "Enter the next generation. Hey5050 console access." },
    ],
  }),
  component: Login,
});

function Login() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Atmospheric visual */}
      <aside className="relative hidden overflow-hidden border-r border-border lg:block">
        <img
          src={planet}
          alt=""
          width={1024}
          height={1536}
          className="absolute inset-0 size-full object-cover opacity-80"
        />
        <Starfield />
        <OrbitRings className="opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/10" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Link to="/">
            <Logo />
          </Link>
          <div className="max-w-sm">
            <HudChip tone="active">Secure Docking</HudChip>
            <h2 className="mt-5 text-3xl font-semibold leading-tight">
              Entering the Hey5050 orbital console
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Connect your TikTok account for AI-powered growth management
              through a secure browser session.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            <StatusDot label="System online" />
            <HudLabel>Year 5050</HudLabel>
          </div>
        </div>
      </aside>

      {/* Login panel */}
      <main className="relative flex items-center justify-center px-5 py-14 sm:px-8">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 grid-lines opacity-30" />
          <div className="absolute inset-0 atmosphere" />
        </div>

        <div className="w-full max-w-md animate-rise">
          <Link to="/" className="mb-10 inline-flex lg:hidden">
            <Logo />
          </Link>

          <HudLabel>Access Terminal</HudLabel>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Welcome to Hey5050</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Connect your TikTok account through a secure browser session.
            You log in directly — your credentials never leave TikTok.
          </p>

          <div className="mt-9 flex flex-col gap-4">
            <Button asChild variant="hero" size="lg" className="w-full">
              <a href="/accounts/tiktok/connect">
                <Music2 className="size-4" /> Add TikTok Account
                <ArrowRight className="size-4" />
              </a>
            </Button>
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Your TikTok credentials are never stored by Hey5050.
            A persistent browser profile maintains your session for AI-powered observation.
          </p>
        </div>
      </main>
    </div>
  );
}
