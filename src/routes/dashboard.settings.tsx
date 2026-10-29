import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { DashboardLayout } from "@/components/hey/DashboardLayout";
import { HudChip, HudLabel, Panel, StatusDot } from "@/components/hey/primitives";
import { SectionPanel } from "@/components/dashboard";
import { useServerFn } from "@tanstack/react-start";
import { getAccountDashboardFn } from "@/lib/account/account-dashboard-fns";
import type { AccountDashboardData } from "@/lib/account/account-dashboard-fns";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Hey5050 Console" },
      {
        name: "description",
        content: "Account status and preferences in the Hey5050 console.",
      },
      { property: "og:title", content: "Settings — Hey5050 Console" },
      { property: "og:description", content: "Account status and preferences." },
    ],
  }),
  component: Page,
});

function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Page() {
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

  return (
    <DashboardLayout
      title="Settings"
      description="Account status and preferences."
    >
      <div className="flex flex-wrap items-center gap-3">
        <HudChip tone="active">System Settings</HudChip>
        <HudLabel>Account configuration</HudLabel>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        {/* Primary Account Status */}
        <SectionPanel title="TikTok Primary Account">
          <div className="flex flex-col gap-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading account status...</p>
            ) : account ? (
              <>
                <div className="flex items-center gap-3">
                  {account.avatarUrl ? (
                    <img
                      src={account.avatarUrl}
                      alt=""
                      className="size-12 rounded-full border border-border object-cover"
                    />
                  ) : (
                    <span className="grid size-12 shrink-0 place-items-center rounded-full border border-border bg-surface/40">
                      <span className="text-sm text-muted-foreground">TK</span>
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {account.username ? `@${account.username}` : "TikTok Account"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {account.displayName ?? "Primary account"}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-surface/30 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Account Status</span>
                    <StatusDot
                      label={isConnected ? "Connected" : "Not connected"}
                      tone={isConnected ? "online" : "offline"}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Browser Profile</span>
                    <span className="text-sm font-medium">
                      {account.browserProfileId ? "Ready" : "Not set"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Mode</span>
                    <span className="text-sm font-medium">Single Account</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Runtime Source</span>
                    <span className="text-sm font-medium">
                      {runtime?.state?.source === "cloud"
                        ? "Cloud Browser"
                        : runtime?.state?.source === "device"
                          ? "Mobile Device"
                          : runtime?.state?.source === "vps"
                            ? "VPS / Server"
                            : "Local Computer"}
                    </span>
                  </div>
                </div>
                <a
                  href="/accounts/tiktok/workspace"
                  className="text-xs text-primary hover:underline"
                >
                  Open Workspace →
                </a>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  No TikTok account connected.
                </p>
                <a
                  href="/accounts/tiktok/connect"
                  className="mt-3 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Connect TikTok Account
                </a>
              </div>
            )}
          </div>
        </SectionPanel>

        <div className="flex flex-col gap-6">
          {/* Appearance */}
          <SectionPanel title="Appearance">
            <div className="flex flex-col gap-4">
              <SettingsRow
                label="Dark Mode"
                description="Use the deep-space dark interface"
              >
                <Switch defaultChecked />
              </SettingsRow>
              <SettingsRow
                label="Reduce Motion"
                description="Minimise animations and transitions"
              >
                <Switch />
              </SettingsRow>
            </div>
          </SectionPanel>

          {/* Notifications */}
          <SectionPanel title="Notifications">
            <div className="flex flex-col gap-4">
              <SettingsRow
                label="Connection Alerts"
                description="Alerts when TikTok session status changes"
              >
                <Switch defaultChecked />
              </SettingsRow>
              <SettingsRow
                label="Agent Activity Alerts"
                description="Notify on significant agent observations"
              >
                <Switch defaultChecked />
              </SettingsRow>
            </div>
          </SectionPanel>
        </div>
      </div>
    </DashboardLayout>
  );
}
