import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/hey/Logo";
import { HudChip, Panel } from "@/components/hey/primitives";
import {
  connectPrimaryAccountFn,
  detectAccountFromBrowserFn,
} from "@/lib/account/primary-account-fns";
import type { ConnectResult } from "@/lib/account/primary-account";

export const Route = createFileRoute("/accounts/tiktok/connect")({
  head: () => ({
    meta: [
      { title: "Connect TikTok — Hey5050" },
      {
        name: "description",
        content: "Connect your TikTok account through a secure browser session.",
      },
    ],
  }),
  component: ConnectTikTok,
});

type ConnectState =
  | "idle"
  | "launching"
  | "browser_open"
  | "detecting"
  | "detected"
  | "error";

function ConnectTikTok() {
  const [state, setState] = useState<ConnectState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [username, setUsername] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const doConnect = useServerFn(connectPrimaryAccountFn);

  const handleConnect = useCallback(async () => {
    setState("launching");
    setErrorMsg("");

    try {
      const result = await doConnect();

      if (result?.success && result.sessionId) {
        setState("browser_open");
        setSessionId(result.sessionId);
      } else {
        setState("error");
        setErrorMsg(result?.error ?? "Failed to launch browser");
      }
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
    }
  }, [doConnect]);

  const handleDetect = useCallback(async () => {
    if (!sessionId) return;

    setState("detecting");

    try {
      const result = await detectAccountFromBrowserFn({ data: sessionId });

      if (result?.detected) {
        setState("detected");
        setUsername(result.username ?? null);
      } else {
        setState("error");
        setErrorMsg(
          "Could not detect TikTok account. Make sure you are logged in.",
        );
      }
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Detection failed");
    }
  }, [sessionId]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute inset-0 grid-lines opacity-30" />
        <div className="absolute inset-0 atmosphere" />
      </div>

      <div className="w-full max-w-lg text-center animate-rise">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <HudChip>Browser Connection</HudChip>
        <h1 className="mt-4 text-2xl font-semibold sm:text-3xl">
          Connect TikTok Account
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          A secure browser will open for you to log into TikTok.
          Your credentials are entered directly into TikTok — Hey5050
          never sees your password.
        </p>

        <Panel className="mt-8 p-6 text-left">
          {state === "idle" && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Click below to launch a persistent browser session.
                You will be taken to TikTok's login page.
              </p>
              <Button
                variant="hero"
                size="lg"
                className="w-full"
                onClick={handleConnect}
              >
                Launch Browser
              </Button>
            </div>
          )}

          {state === "launching" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">
                Creating browser profile...
              </p>
            </div>
          )}

          {state === "browser_open" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-green-500" />
                <p className="text-sm font-medium">Browser is open</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Log into your TikTok account in the browser window.
                Once you see your TikTok feed, come back here and
                click "Detect Account".
              </p>
              <Button
                variant="hero"
                size="lg"
                className="w-full"
                onClick={handleDetect}
              >
                Detect Account
              </Button>
            </div>
          )}

          {state === "detecting" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">
                Reading TikTok page...
              </p>
            </div>
          )}

          {state === "detected" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-green-500" />
                <p className="text-sm font-medium">Account Connected</p>
              </div>
              {username && (
                <p className="text-lg font-semibold">@{username}</p>
              )}
              <Button
                variant="hero"
                size="lg"
                className="w-full"
                onClick={() => {
                  window.location.href = "/accounts/tiktok";
                }}
              >
                Go to Account Workspace
              </Button>
            </div>
          )}

          {state === "error" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-destructive" />
                <p className="text-sm font-medium">Connection Failed</p>
              </div>
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <Button
                variant="glass"
                size="lg"
                className="w-full"
                onClick={() => {
                  setState("idle");
                  setErrorMsg("");
                }}
              >
                Try Again
              </Button>
            </div>
          )}
        </Panel>

        <p className="mt-6 text-xs text-muted-foreground">
          Your TikTok credentials are never stored by Hey5050.
          Only a secure browser profile reference is saved.
        </p>
      </div>
    </div>
  );
}
