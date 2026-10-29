import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bot, Cloud, Globe, Laptop, Music2, Smartphone, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/hey/DashboardLayout";
import { HudChip, HudLabel, Panel, StatusDot } from "@/components/hey/primitives";
import { useServerFn } from "@tanstack/react-start";
import { getAccountDashboardFn } from "@/lib/account/account-dashboard-fns";
import type { AccountDashboardData } from "@/lib/account/account-dashboard-fns";

export const Route = createFileRoute("/dashboard/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations — Hey5050 Console" },
      {
        name: "description",
        content: "Manage your TikTok primary account connection.",
      },
      { property: "og:title", content: "Integrations — Hey5050 Console" },
      { property: "og:description", content: "TikTok browser account management." },
    ],
  }),
  component: Integrations,
});

function Integrations() {
  const [data, setData] = useState<AccountDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useServerFn(getAccountDashboardFn);

  useEffect(() => {
    fetchDashboard()
      .then((result) => setData(result as AccountDashboardData))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fetchDashboard]);

  const account = data?.account ?? null;
  const runtime = data?.runtime ?? null;
  const isConnected = account?.status === "connected";
  const isRuntimeActive = runtime?.isActive ?? false;

  return (
    <DashboardLayout
      title="Integrations"
      description="Manage your platform connections."
    >
      <div className="flex flex-wrap items-center gap-3">
        <HudChip tone="active">Primary Account</HudChip>
        <HudLabel>
          {loading
            ? "Checking..."
            : isConnected
              ? "1 connected"
              : "0 connected"}
        </HudLabel>
      </div>

      {/* Primary TikTok Account */}
      <Panel className="flex flex-col gap-5 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            {account?.avatarUrl ? (
              <img
                src={account.avatarUrl}
                alt=""
                className="size-12 shrink-0 rounded-2xl border border-border object-cover"
              />
            ) : (
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-border bg-surface/60 text-primary">
                <Music2 className="size-5" strokeWidth={1.5} />
              </span>
            )}
            <div className="min-w-0">
              <h3 className="text-base font-semibold">TikTok Primary Account</h3>
              <HudLabel>
                {loading
                  ? "Checking..."
                  : account?.username
                    ? `@${account.username} · Browser-managed`
                    : "Not connected"}
              </HudLabel>
            </div>
          </div>
          {!loading && (
            <StatusDot
              label={isConnected ? "Connected" : "Not connected"}
              tone={isConnected ? "online" : "offline"}
            />
          )}
        </div>

        {loading ? (
          <div className="rounded-xl border border-border bg-surface/30 p-4">
            <p className="text-sm text-muted-foreground">Loading connection status...</p>
          </div>
        ) : isConnected ? (
          <div className="rounded-xl border border-border bg-surface/30 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <HudLabel>Account</HudLabel>
                <p className="mt-1 text-sm font-medium">
                  {account?.displayName ?? account?.username ?? "—"}
                </p>
              </div>
              <div>
                <HudLabel>Agent</HudLabel>
                <div className="mt-1">
                  <StatusDot
                    label={isRuntimeActive ? "Active" : "Offline"}
                    tone={isRuntimeActive ? "online" : "offline"}
                  />
                </div>
              </div>
              <div>
                <HudLabel>Browser Profile</HudLabel>
                <p className="mt-1 text-sm font-medium">
                  {account?.browserProfileId ? "Ready" : "Not set"}
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 mt-3 border-t border-border pt-3">
              <div>
                <HudLabel>Runtime Source</HudLabel>
                <div className="mt-1 flex items-center gap-1.5 text-sm font-medium">
                  {runtime?.state?.source === "cloud" ? (
                    <Cloud className="size-3" />
                  ) : runtime?.state?.source === "device" ? (
                    <Smartphone className="size-3" />
                  ) : (
                    <Laptop className="size-3" />
                  )}
                  {runtime?.state?.source === "cloud"
                    ? "Cloud Browser"
                    : runtime?.state?.source === "device"
                      ? "Mobile Device"
                      : "Local Computer"}
                </div>
              </div>
              <div>
                <HudLabel>TikTok Session</HudLabel>
                <div className="mt-1">
                  <StatusDot
                    label={isRuntimeActive ? "Healthy" : "Inactive"}
                    tone={isRuntimeActive ? "online" : "offline"}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Connect your TikTok account through a secure browser session.
            Your credentials are entered directly into TikTok — Hey5050
            never sees your password.
          </p>
        )}

        <div className="mt-auto flex items-center gap-3 border-t border-border pt-4">
          {isConnected ? (
            <Button asChild variant="hero" size="sm">
              <Link to="/accounts/tiktok/workspace">
                <Bot className="size-3.5" />
                Open Workspace
              </Link>
            </Button>
          ) : (
            <Button asChild variant="hero" size="sm">
              <a href="/accounts/tiktok/connect">
                <Globe className="size-3.5" />
                Connect TikTok Account
              </a>
            </Button>
          )}
        </div>
      </Panel>

      {/* How Connection Works */}
      <Panel className="flex flex-col gap-4 p-6">
        <HudChip>How Connection Works</HudChip>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <span className="font-mono text-sm text-primary">01</span>
            <h4 className="text-sm font-semibold">Connect</h4>
            <p className="text-xs leading-relaxed text-muted-foreground">
              A persistent browser profile is created for your TikTok account.
            </p>
          </div>
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <span className="font-mono text-sm text-primary">02</span>
            <h4 className="text-sm font-semibold">Login</h4>
            <p className="text-xs leading-relaxed text-muted-foreground">
              You log into TikTok directly — your password never touches Hey5050.
            </p>
          </div>
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <span className="font-mono text-sm text-primary">03</span>
            <h4 className="text-sm font-semibold">Agent</h4>
            <p className="text-xs leading-relaxed text-muted-foreground">
              AI Agent uses the persistent browser to observe, analyze, and grow.
            </p>
          </div>
        </div>
      </Panel>
    </DashboardLayout>
  );
}
