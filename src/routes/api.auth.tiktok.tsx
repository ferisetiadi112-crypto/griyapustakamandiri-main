import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { initiateTikTokOAuth } from "@/lib/tiktok-server";

/**
 * GET /api/auth/tiktok
 *
 * This route initiates the TikTok OAuth flow.
 *
 * The server function sets the OAuth state cookie and returns the
 * TikTok authorization URL. The component redirects the browser
 * client-side after receiving the URL.
 *
 * We do NOT throw a Response from the loader because TanStack Start's
 * SSR pipeline catches thrown Responses and renders a 500 error page
 * instead of issuing a redirect.
 */
export const Route = createFileRoute("/api/auth/tiktok")({
  head: () => ({
    meta: [{ title: "TikTok Authorization — Hey5050" }],
  }),
  component: TikTokOAuthInit,
});

function TikTokOAuthInit() {
  useEffect(() => {
    initiateTikTokOAuth()
      .then((result) => {
        if (result.success && result.authUrl) {
          window.location.href = result.authUrl;
        } else {
          window.location.href = `/api/auth/callback?error=${encodeURIComponent(result.error || "init_failed")}`;
        }
      })
      .catch(() => {
        window.location.href = "/api/auth/callback?error=server_error";
      });
  }, []);

  return null;
}
