import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Cloud, Clock, Eye, Globe, Laptop, Smartphone, RefreshCw, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/hey/DashboardLayout";
import { HudChip, HudLabel, Panel, StatusDot } from "@/components/hey/primitives";
import {
  getPrimaryAccountFn,
  restorePrimarySessionFn,
} from "@/lib/account/primary-account-fns";
import { getAccountDashboardFn } from "@/lib/account/account-dashboard-fns";
import { observePrimaryAccountFn } from "@/lib/agent/observer-fns";
import {
  startRuntimeFn,
  stopRuntimeFn,
} from "@/lib/runtime/runtime-fns";

import type { PrimaryAccount, AccountStatus } from "@/lib/account/primary-account";
import type { ObservationReport } from "@/lib/agent/report";
import type {
  RuntimeStatus,
  RuntimeState,
  ObservationScheduleEntry,
} from "@/lib/runtime/types";
import type { AccountDashboardData } from "@/lib/account/account-dashboard-fns";

export const Route = createFileRoute("/accounts/tiktok/workspace")({
  head: () => ({
    meta: [
      { title: "TikTok Agent Workspace — Hey5050" },
      {
        name: "description",
        content:
          "AI Agent workspace for your primary TikTok account. Observe, analyze, and grow.",
      },
    ],
  }),
  component: TikTokWorkspace,
});

// ─── Status Helpers ───────────────────────────────────────

function AgentBadge({ status }: { status: RuntimeStatus }) {
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
    case "starting":
      return (
        <HudChip>
          <span className="size-1.5 animate-pulse-soft rounded-full bg-primary" /> Starting...
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
          ⚠ Human Action Required
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

function AccountConnectionDot({ status }: { status: AccountStatus }) {
  switch (status) {
    case "connected":
      return <StatusDot label="Account Connected" tone="online" />;
    case "session_expired":
      return <StatusDot label="Session Expired" tone="idle" />;
    case "human_action_required":
      return <StatusDot label="Action Required" tone="idle" />;
    case "connecting":
      return <StatusDot label="Connecting..." tone="idle" />;
    case "browser_error":
      return <StatusDot label="Browser Error" tone="offline" />;
    default:
      return <StatusDot label="Not Connected" tone="offline" />;
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

function formatTargetLabel(target: string): string {
  return target
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
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
      return <Cloud className="size-3" />;
    case "device":
      return <Smartphone className="size-3" />;
    default:
      return <Laptop className="size-3" />;
  }
}

// ─── Main Component ───────────────────────────────────────

function TikTokWorkspace() {
  const [data, setData] = useState<AccountDashboardData | null>(null);
  const [report, setReport] = useState<ObservationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [observing, setObserving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);

  const fetchDashboard = useServerFn(getAccountDashboardFn);
  const doRestore = useServerFn(restorePrimarySessionFn);
  const doObserve = useServerFn(observePrimaryAccountFn);
  const doStartRuntime = useServerFn(startRuntimeFn);
  const doStopRuntime = useServerFn(stopRuntimeFn);

  const refreshAll = useCallback(async () => {
    try {
      const result = await fetchDashboard();
      setData(result as AccountDashboardData);
    } catch {
      // ignore
    }
  }, [fetchDashboard]);

  useEffect(() => {
    refreshAll().finally(() => setLoading(false));
  }, [refreshAll]);

  // Auto-refresh every 15s
  useEffect(() => {
    const interval = setInterval(refreshAll, 15_000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  const handleStartRuntime = useCallback(async () => {
    setStarting(true);
    try {
      await doStartRuntime({ data: "local" });
      await refreshAll();
    } catch {
      // ignore
    } finally {
      setStarting(false);
    }
  }, [doStartRuntime, refreshAll]);

  const handleStopRuntime = useCallback(async () => {
    setStopping(true);
    try {
      await doStopRuntime();
      await refreshAll();
    } catch {
      // ignore
    } finally {
      setStopping(false);
    }
  }, [doStopRuntime, refreshAll]);

  const handleRestore = useCallback(async () => {
    setRestoring(true);
    try {
      await doRestore();
      await refreshAll();
    } catch {
      // ignore
    } finally {
      setRestoring(false);
    }
  }, [doRestore, refreshAll]);

  const handleObserve = useCallback(async () => {
    setObserving(true);
    try {
      const result = await doObserve();
      if (result) {
        setReport(result as ObservationReport);
      }
      await refreshAll();
    } catch {
      // ignore
    } finally {
      setObserving(false);
    }
  }, [doObserve, refreshAll]);

  const account = data?.account ?? null;
  const runtime = data?.runtime ?? null;
  const activity = data?.activity ?? [];
  const humanTasks = data?.humanTasks ?? [];
  const observations = data?.observations ?? [];

  const isConnected = account?.status === "connected";
  const isRuntimeActive = runtime?.isActive ?? false;
  const needsHumanAction =
    runtime?.status === "human_action_required" ||
    runtime?.status === "session_expired";

  // ─── Not Connected State ──────────────────────────────

  if (!loading && !account) {
    return (
      <DashboardLayout
        title="TikTok Agent Workspace"
        description="Connect your primary TikTok account to start AI-powered observation and growth."
      >
        <Panel className="flex flex-col items-center gap-6 p-10 text-center">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl border border-border bg-surface/60 text-primary">
            <span className="text-2xl">♪</span>
          </span>
          <div>
            <h3 className="text-lg font-semibold">No TikTok Account Connected</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Connect your TikTok account through a secure browser session.
              You log in directly to TikTok — Hey5050 never sees your password.
            </p>
          </div>
          <Button asChild variant="hero" size="lg">
            <a href="/accounts/tiktok/connect">Connect TikTok Account</a>
          </Button>
        </Panel>
      </DashboardLayout>
    );
  }

  // ─── Main Workspace ────────────────────────────────────

  return (
    <DashboardLayout
      title="TikTok Agent Workspace"
      description={
        isConnected
          ? `AI Agent managing @${account?.username ?? "account"}`
          : "TikTok Agent Workspace"
      }
    >
      {/* ── Primary Account Card ─────────────────────── */}
      <Panel className="p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar / identity */}
            {account?.avatarUrl ? (
              <img
                src={account.avatarUrl}
                alt=""
                className="size-14 shrink-0 rounded-2xl border border-border object-cover"
              />
            ) : (
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-border bg-surface/60 text-primary text-xl">
                ♪
              </span>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">
                  {account?.username ? `@${account.username}` : "TikTok Account"}
                </h2>
                {account?.displayName && (
                  <span className="text-sm text-muted-foreground">
                    {account.displayName}
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                <AccountConnectionDot status={account?.status ?? "not_connected"} />
                <AgentBadge status={runtime?.status ?? "offline"} />
              </div>
            </div>
          </div>

          {/* Quick action buttons */}
          <div className="flex flex-wrap gap-2">
            {needsHumanAction ? (
              <Button
                variant="hero"
                size="sm"
                onClick={handleRestore}
                disabled={restoring}
              >
                <Globe className="size-3.5" />
                {restoring ? "Opening..." : "Open Browser"}
              </Button>
            ) : isRuntimeActive ? (
              <Button
                variant="glass"
                size="sm"
                onClick={handleStopRuntime}
                disabled={stopping}
              >
                {stopping ? "Stopping..." : "Stop Agent"}
              </Button>
            ) : (
              <Button
                variant="hero"
                size="sm"
                onClick={handleStartRuntime}
                disabled={starting || !isConnected}
              >
                <Zap className="size-3.5" />
                {starting ? "Starting..." : "Start Agent"}
              </Button>
            )}
            <Button
              variant="glass"
              size="sm"
              onClick={handleObserve}
              disabled={observing || !isConnected}
            >
              <Eye className="size-3.5" />
              {observing ? "Observing..." : "Observe Now"}
            </Button>
          </div>
        </div>
      </Panel>

      {/* ── Human Action Required ─────────────────────── */}
      {needsHumanAction && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-5">
          <p className="text-sm font-medium text-orange-500">
            ⚠️ Human Action Required
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            TikTok requires manual intervention — CAPTCHA, 2FA, or a security verification.
            Open the browser to complete the action, then the agent will resume automatically.
          </p>
          <Button
            variant="hero"
            size="sm"
            className="mt-3"
            onClick={handleRestore}
            disabled={restoring}
          >
            <Globe className="size-3.5" />
            {restoring ? "Opening..." : "Open Browser"}
          </Button>
        </div>
      )}

      {/* ── Agent Status & Current Task ───────────────── */}
      {isConnected && (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Left: Agent Status */}
          <Panel className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                AI Agent
              </h3>
              <AgentBadge status={runtime?.status ?? "offline"} />
            </div>

            <div className="rounded-xl border border-border bg-surface/30 p-4">
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <HudLabel>Running On</HudLabel>
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <RuntimeSourceIcon source={runtime?.state?.source} />
                    {formatRuntimeSource(runtime?.state?.source)}
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <HudLabel>Current Task</HudLabel>
                  <span className="text-sm font-medium">
                    {runtime?.state?.currentTask
                      ? formatTargetLabel(runtime.state.currentTask)
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <HudLabel>Next Task</HudLabel>
                  <span className="text-sm font-medium">
                    {runtime?.state?.nextTaskTarget
                      ? formatTargetLabel(runtime.state.nextTaskTarget)
                      : "—"}
                  </span>
                </div>
                {runtime?.state?.nextTaskRunAt && (
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <HudLabel>Next Run</HudLabel>
                    <span className="text-sm font-medium">
                      {formatTimeAgo(runtime.state.nextTaskRunAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Observation targets */}
            {runtime?.schedule && runtime.schedule.length > 0 && (
              <div className="rounded-xl border border-border bg-surface/30 p-4">
                <HudLabel>Observation Schedule</HudLabel>
                <div className="mt-2 flex flex-col gap-1">
                  {runtime.schedule
                    .filter((s) => s.enabled)
                    .map((entry) => (
                      <div
                        key={entry.target}
                        className="flex items-center justify-between border-b border-border py-1.5 last:border-0"
                      >
                        <span className="text-xs text-muted-foreground">
                          {formatTargetLabel(entry.target)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                              entry.priority === "high"
                                ? "bg-red-500/10 text-red-500"
                                : entry.priority === "medium"
                                  ? "bg-yellow-500/10 text-yellow-500"
                                  : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {entry.priority}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {entry.lastObservedAt
                              ? formatTimeAgo(entry.lastObservedAt)
                              : "not yet"}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </Panel>

          {/* Right: Account Health */}
          <Panel className="flex flex-col gap-4 p-5">
            <h3 className="text-sm font-semibold text-foreground">
              Account Health
            </h3>

            <div className="rounded-xl border border-border bg-surface/30 p-4">
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <HudLabel>Account</HudLabel>
                  <StatusDot
                    label={isConnected ? "Connected" : "Not connected"}
                    tone={isConnected ? "online" : "offline"}
                  />
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <HudLabel>Runtime</HudLabel>
                  <StatusDot
                    label={isRuntimeActive ? "Active" : "Offline"}
                    tone={isRuntimeActive ? "online" : "offline"}
                  />
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <HudLabel>Browser</HudLabel>
                  <StatusDot
                    label={isRuntimeActive ? "Connected" : "Not connected"}
                    tone={isRuntimeActive ? "online" : "offline"}
                  />
                </div>
                {runtime?.state?.lastHeartbeatAt && (
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <HudLabel>Last Heartbeat</HudLabel>
                    <span className="text-sm font-medium">
                      {formatTimeAgo(runtime.state.lastHeartbeatAt)}
                    </span>
                  </div>
                )}
                {account?.lastObservedAt && (
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <HudLabel>Last Observation</HudLabel>
                    <span className="text-sm font-medium">
                      {formatTimeAgo(account.lastObservedAt)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <HudLabel>Runtime Source</HudLabel>
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <RuntimeSourceIcon source={runtime?.state?.source} />
                    {formatRuntimeSource(runtime?.state?.source)}
                  </div>
                </div>
              </div>
            </div>

            {runtime?.state?.error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <HudLabel className="text-destructive">Error</HudLabel>
                <p className="mt-1 text-sm text-muted-foreground">
                  {runtime.state.error}
                </p>
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* ── Observation Results ───────────────────────── */}
      {report && (
        <Panel className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Latest Observation
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {new Date(report.observedAt).toLocaleString()}
              </p>
            </div>
            <HudLabel>{report.confidence}</HudLabel>
          </div>

          {report.account && (
            <div className="rounded-xl border border-border bg-surface/30 p-4">
              <HudLabel>Account Data</HudLabel>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {Object.entries(report.account).map(([key, value]) => {
                  if (!value || typeof value !== "object") return null;
                  const field = value as {
                    value: unknown;
                    classification: string;
                  };
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between border-b border-border py-1.5 last:border-0"
                    >
                      <span className="text-xs text-muted-foreground capitalize">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {String(field.value ?? "—")}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            field.classification === "OBSERVED"
                              ? "bg-green-500/10 text-green-500"
                              : field.classification === "INFERRED"
                                ? "bg-yellow-500/10 text-yellow-500"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {field.classification}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {report.summary && (
            <div className="rounded-xl border border-border bg-surface/30 p-4">
              <HudLabel>Summary</HudLabel>
              <p className="mt-2 text-sm text-muted-foreground">
                {report.summary}
              </p>
            </div>
          )}

          {report.unknown && report.unknown.length > 0 && (
            <div className="rounded-xl border border-border bg-surface/30 p-4">
              <HudLabel>Unknown / Not Available</HudLabel>
              <div className="mt-2 flex flex-col gap-1">
                {report.unknown.map((item, i) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    • {item}
                  </p>
                ))}
              </div>
            </div>
          )}
        </Panel>
      )}

      {/* ── Previous Observations ─────────────────────── */}
      {observations.length > 0 && (
        <Panel className="flex flex-col gap-4 p-5">
          <h3 className="text-sm font-semibold text-foreground">
            Observation History
          </h3>
          <div className="flex flex-col gap-2">
            {observations.map((obs) => (
              <div
                key={obs.id}
                className="flex items-center justify-between rounded-xl border border-border bg-surface/30 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {obs.category.replace(/_/g, " ")}
                  </p>
                  {obs.rawSummary && (
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">
                      {obs.rawSummary}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      obs.confidence === "observed"
                        ? "bg-green-500/10 text-green-500"
                        : obs.confidence === "inferred"
                          ? "bg-yellow-500/10 text-yellow-500"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {obs.confidence}
                  </span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatTimeAgo(obs.observedAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* ── Agent Activity Timeline ───────────────────── */}
      {activity.length > 0 && (
        <Panel className="flex flex-col gap-4 p-5">
          <h3 className="text-sm font-semibold text-foreground">
            Agent Activity
          </h3>
          <div className="flex flex-col gap-1">
            {activity.slice(0, 10).map((item) => {
              const typeIcon = (() => {
                switch (item.type) {
                  case "OBSERVATION_COMPLETED":
                  case "OBSERVATION_STARTED":
                    return <Eye className="size-3 text-primary" />;
                  case "RUNTIME_STARTED":
                  case "RUNTIME_STOPPED":
                    return <Zap className="size-3 text-primary" />;
                  case "HUMAN_ACTION_REQUIRED":
                    return (
                      <span className="size-1.5 rounded-full bg-orange-500" />
                    );
                  case "TIKTOK_SESSION_EXPIRED":
                    return (
                      <span className="size-1.5 rounded-full bg-yellow-500" />
                    );
                  default:
                    return (
                      <span className="size-1.5 rounded-full bg-primary/60" />
                    );
                }
              })();

              return (
                <div
                  key={item.id}
                  className="flex items-start gap-2.5 border-b border-border py-2.5 last:border-0"
                >
                  <span className="mt-1 shrink-0">{typeIcon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">{item.summary}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatTimeAgo(item.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* ── Pending Human Tasks ──────────────────────── */}
      {humanTasks.length > 0 && (
        <Panel className="flex flex-col gap-4 p-5">
          <h3 className="text-sm font-semibold text-foreground">
            Pending Human Tasks
          </h3>
          <div className="flex flex-col gap-2">
            {humanTasks.map((task) => (
              <div
                key={task.id}
                className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4"
              >
                <p className="text-sm font-medium">{task.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {task.description}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </DashboardLayout>
  );
}
