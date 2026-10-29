import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Bot,
  Cloud,
  Eye,
  FileText,
  Globe,
  Laptop,
  Music2,
  Settings,
  Smartphone,
  Sparkles,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/hey/DashboardLayout";
import { HudChip, HudLabel, Panel, StatusDot } from "@/components/hey/primitives";
import { useServerFn } from "@tanstack/react-start";
import { getAccountDashboardFn } from "@/lib/account/account-dashboard-fns";
import { startRuntimeFn, stopRuntimeFn } from "@/lib/runtime/runtime-fns";
import type { AccountDashboardData } from "@/lib/account/account-dashboard-fns";
import type { RuntimeStatus } from "@/lib/runtime/types";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Hey5050 Console" },
      {
        name: "description",
        content: "AI Agent dashboard for your primary TikTok account.",
      },
      { property: "og:title", content: "Dashboard — Hey5050" },
      {
        property: "og:description",
        content: "AI Agent dashboard for your primary TikTok account.",
      },
    ],
  }),
  component: Overview,
});

function AgentStatusBadge({ status }: { status: RuntimeStatus }) {
  switch (status) {
    case "active":
      return (
        <HudChip tone="active">
          <Bot className="size-3" /> Agent Active
        </HudChip>
      );
    case "idle":
      return (
        <HudChip>
          <Bot className="size-3" /> Agent Idle
        </HudChip>
      );
    case "session_expired":
      return (
        <HudChip className="border-yellow-500/40 text-yellow-500">
          ⚠ Session Expired
        </HudChip>
      );
    case "human_action_required":
      return (
        <HudChip className="border-orange-500/40 text-orange-500">
          ⚠ Action Required
        </HudChip>
      );
    case "error":
      return (
        <HudChip className="border-destructive/40 text-destructive">
          ✗ Error
        </HudChip>
      );
    default:
      return <HudChip>Agent Offline</HudChip>;
  }
}

function formatTimeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatRuntimeSource(source: string | undefined): string {
  switch (source) {
    case "cloud":
      return "Cloud Browser";
    case "vps":
      return "VPS / Server";
    case "device":
      return "Mobile Device";
    case "local":
    default:
      return "Local Computer";
  }
}

function RuntimeSourceIcon({ source }: { source: string | undefined }) {
  switch (source) {
    case "cloud":
      return <Cloud className="size-3.5" />;
    case "device":
      return <Smartphone className="size-3.5" />;
    default:
      return <Laptop className="size-3.5" />;
  }
}

function Overview() {
  const [data, setData] = useState<AccountDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);

  const fetchDashboard = useServerFn(getAccountDashboardFn);
  const doStartRuntime = useServerFn(startRuntimeFn);
  const doStopRuntime = useServerFn(stopRuntimeFn);

  useEffect(() => {
    fetchDashboard()
      .then((result) => setData(result as AccountDashboardData))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fetchDashboard]);

  const refreshData = async () => {
    try {
      const result = await fetchDashboard();
      setData(result as AccountDashboardData);
    } catch {
      // ignore
    }
  };

  const handleStart = async () => {
    setStarting(true);
    try {
      await doStartRuntime({ data: "local" });
      await refreshData();
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async () => {
    setStopping(true);
    try {
      await doStopRuntime();
      await refreshData();
    } finally {
      setStopping(false);
    }
  };

  const account = data?.account ?? null;
  const runtime = data?.runtime ?? null;
  const activity = data?.activity ?? [];
  const isConnected = account?.status === "connected";
  const isRuntimeActive = runtime?.isActive ?? false;

  return (
    <DashboardLayout
      title="Dashboard"
      description="AI Agent control console for your primary TikTok account."
    >
      {/* Status chips */}
      <div className="flex flex-wrap items-center gap-3">
        <HudChip tone="active">Console Active</HudChip>
        <HudLabel>Phase 1E · Browser Runtime</HudLabel>
      </div>

      {/* ── Primary TikTok Account Card ──────────────── */}
      <Panel className="flex flex-col gap-5 p-6">
        <div className="flex items-center justify-between gap-3">
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
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {account?.username
                  ? `@${account.username}`
                  : "TikTok Primary Account"}
              </h3>
              {loading ? (
                <HudLabel>Checking status...</HudLabel>
              ) : isConnected ? (
                <div className="mt-1 flex items-center gap-2">
                  <StatusDot label="Connected" tone="online" />
                  <AgentStatusBadge status={runtime?.status ?? "offline"} />
                </div>
              ) : (
                <HudLabel>Not connected</HudLabel>
              )}
            </div>
          </div>

          {/* Action buttons */}
          {!loading && (
            <div className="flex items-center gap-2">
              {isConnected && isRuntimeActive ? (
                <Button
                  variant="glass"
                  size="sm"
                  onClick={handleStop}
                  disabled={stopping}
                >
                  {stopping ? "Stopping..." : "Stop Agent"}
                </Button>
              ) : isConnected ? (
                <Button
                  variant="hero"
                  size="sm"
                  onClick={handleStart}
                  disabled={starting}
                >
                  <Zap className="size-3.5" />
                  {starting ? "Starting..." : "Start Agent"}
                </Button>
              ) : null}
              <Button asChild variant="glass" size="sm">
                <Link to="/accounts/tiktok/workspace">
                  Open Workspace
                </Link>
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="rounded-xl border border-border bg-surface/30 p-4">
            <p className="text-sm text-muted-foreground">Loading account status...</p>
          </div>
        ) : isConnected ? (
          <div className="grid gap-3 rounded-xl border border-border bg-surface/30 p-4 sm:grid-cols-3">
            <div>
              <HudLabel>Account</HudLabel>
              <p className="mt-1 text-sm font-medium">
                {account?.displayName ?? account?.username ?? "—"}
              </p>
            </div>
            <div>
              <HudLabel>Last Observation</HudLabel>
              <p className="mt-1 text-sm font-medium">
                {formatTimeAgo(account?.lastObservedAt ?? null)}
              </p>
            </div>
            <div>
              <HudLabel>Running On</HudLabel>
              <div className="mt-1 flex items-center gap-1.5 text-sm font-medium">
                <RuntimeSourceIcon source={runtime?.state?.source} />
                {formatRuntimeSource(runtime?.state?.source)}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface/30 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Connect your TikTok account to begin AI-powered observation and growth.
            </p>
            <Button asChild variant="hero" size="sm" className="mt-4">
              <a href="/accounts/tiktok/connect">Connect TikTok Account</a>
            </Button>
          </div>
        )}
      </Panel>

      {/* ── Agent Current Task ────────────────────────── */}
      {isConnected && isRuntimeActive && (
        <Panel className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Agent Status</h3>
            <AgentStatusBadge status={runtime?.status ?? "offline"} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface/30 p-4">
              <HudLabel>Current Task</HudLabel>
              <p className="mt-1 text-sm font-medium">
                {runtime?.state?.currentTask
                  ? runtime.state.currentTask.replace(/_/g, " ")
                  : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface/30 p-4">
              <HudLabel>Next Task</HudLabel>
              <p className="mt-1 text-sm font-medium">
                {runtime?.state?.nextTaskTarget
                  ? runtime.state.nextTaskTarget.replace(/_/g, " ")
                  : "—"}
              </p>
            </div>
          </div>
        </Panel>
      )}

      {/* ── Quick Actions ────────────────────────────── */}
      <div>
        <h3 className="mb-4 text-sm font-semibold text-foreground">Quick Actions</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link to="/accounts/tiktok/workspace">
            <Panel interactive className="flex items-center gap-4 p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-surface/60 text-primary">
                <Music2 className="size-4.5" strokeWidth={1.5} />
              </span>
              <div>
                <p className="text-sm font-semibold">TikTok Workspace</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Agent workspace for your primary account
                </p>
              </div>
            </Panel>
          </Link>
          <Link to="/dashboard/content">
            <Panel interactive className="flex items-center gap-4 p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-surface/60 text-primary">
                <FileText className="size-4.5" strokeWidth={1.5} />
              </span>
              <div>
                <p className="text-sm font-semibold">Content</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  View your TikTok content
                </p>
              </div>
            </Panel>
          </Link>
          <Link to="/dashboard/analytics">
            <Panel interactive className="flex items-center gap-4 p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-surface/60 text-primary">
                <BarChart3 className="size-4.5" strokeWidth={1.5} />
              </span>
              <div>
                <p className="text-sm font-semibold">Analytics</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  View performance data
                </p>
              </div>
            </Panel>
          </Link>
        </div>
      </div>

      {/* ── Recent Activity ──────────────────────────── */}
      {activity.length > 0 && (
        <Panel className="flex flex-col gap-4 p-5">
          <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
          <div className="flex flex-col gap-1">
            {activity.slice(0, 8).map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-2.5 border-b border-border py-2.5 last:border-0"
              >
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary/60" />
                <p className="min-w-0 flex-1 text-xs text-muted-foreground truncate">
                  {item.summary}
                </p>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {formatTimeAgo(item.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* ── System Status ────────────────────────────── */}
      <Panel className="flex flex-col gap-3 p-5">
        <HudLabel>System Status</HudLabel>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-sm text-muted-foreground">System</span>
            <span className="text-sm font-medium">Operational</span>
          </div>
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-sm text-muted-foreground">Account</span>
            <span className="text-sm font-medium">
              {loading ? "Checking..." : isConnected ? "Connected" : "Not connected"}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-sm text-muted-foreground">Agent</span>
            <span className="text-sm font-medium">
              {loading ? "—" : isRuntimeActive ? "Active" : "Offline"}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-sm text-muted-foreground">Runtime</span>
            <span className="text-sm font-medium">
              {formatRuntimeSource(runtime?.state?.source)}
            </span>
          </div>
        </div>
      </Panel>
    </DashboardLayout>
  );
}
