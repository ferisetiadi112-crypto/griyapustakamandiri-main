import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { handleYouTubeCallback } from "@/lib/youtube-server";
import { Logo } from "@/components/hey/Logo";
import { HudChip } from "@/components/hey/primitives";

/**
 * GET /api/auth/youtube/callback
 *
 * Receives the YouTube/Google OAuth callback with ?code=...&state=...
 */
export const Route = createFileRoute("/api/auth/youtube/callback")({
  head: () => ({
    meta: [{ title: "Connecting YouTube — Hey5050" }],
  }),
  component: YouTubeCallback,
});

function YouTubeCallback() {
  const callbackFn = useServerFn(handleYouTubeCallback);
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");

    if (error) {
      setStatus("error");
      setErrorMsg(error);
      return;
    }

    if (!code || !state) {
      setStatus("error");
      setErrorMsg("missing_code_or_state");
      return;
    }

    callbackFn({ data: { code, state } })
      .then((result) => {
        if (result?.redirectUrl) {
          window.location.href = result.redirectUrl;
        } else {
          setStatus("error");
          setErrorMsg("server_error");
        }
      })
      .catch(() => {
        setStatus("error");
        setErrorMsg("server_error");
      });
  }, [callbackFn]);

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center animate-rise">
          <div className="mb-6 flex justify-center">
            <Logo />
          </div>
          <HudChip>Connection Failed</HudChip>
          <h1 className="mt-4 text-2xl font-semibold">
            Could not connect YouTube
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {errorMsg === "token_exchange_failed"
              ? "Google was unable to complete the connection. Please try again."
              : errorMsg === "youtube_invalid_state"
                ? "The connection request expired or was tampered with. Please try again."
                : "Something went wrong during the connection process. Please try again."}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <HudChip tone="active">Connecting</HudChip>
        <h1 className="mt-4 text-2xl font-semibold">
          Connecting your YouTube account...
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Please wait while we complete the connection.
        </p>
      </div>
    </div>
  );
}
