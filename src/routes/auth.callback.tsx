import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";

import { Logo } from "@/components/hey/Logo";
import { HudChip, StatusDot } from "@/components/hey/primitives";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "Authentication — Hey5050" },
      {
        name: "description",
        content: "Processing authentication with Hey5050.",
      },
    ],
  }),
  component: AuthCallback,
});

function AuthCallback() {
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const error = params.get("error");

    if (success === "true") {
      setIsSuccess(true);
    }

    if (error) {
      setErrorMessage(error);
    }
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute inset-0 grid-lines opacity-30" />
        <div className="absolute inset-0 atmosphere" />
      </div>

      <div className="w-full max-w-md text-center animate-rise">
        <Link to="/" className="mb-10 inline-flex">
          <Logo />
        </Link>

        {isSuccess ? (
          <>
            <div className="mx-auto mb-6 grid size-16 place-items-center rounded-full border border-success/30 bg-success/10">
              <CheckCircle className="size-8 text-success" />
            </div>
            <HudChip tone="active">Connected</HudChip>
            <h1 className="mt-4 text-2xl font-semibold">
              TikTok account connected
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Redirecting to your dashboard...
            </p>
            <div className="mt-8">
              <StatusDot label="Session active" tone="online" />
            </div>
            <div className="mt-6">
              <a
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Go to Dashboard
              </a>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto mb-6 grid size-16 place-items-center rounded-full border border-destructive/30 bg-destructive/10">
              <XCircle className="size-8 text-destructive" />
            </div>
            <HudChip>Connection Failed</HudChip>
            <h1 className="mt-4 text-2xl font-semibold">
              Could not connect TikTok
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {errorMessage === "token_exchange_failed"
                ? "TikTok was unable to complete the connection. Please try again."
                : errorMessage === "user_info_failed"
                  ? "TikTok account information could not be retrieved. Please try again."
                  : "Something went wrong during the connection process. Please try again."}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href="/api/auth/tiktok"
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Try Again
              </a>
              <a
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Back to Dashboard
              </a>
            </div>
          </>
        )}

        <p className="mt-10 text-xs text-muted-foreground">
          Hey5050 Orbital Foundation
        </p>
      </div>
    </div>
  );
}
