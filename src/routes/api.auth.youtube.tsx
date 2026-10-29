import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { initiateYouTubeOAuth } from "@/lib/youtube-server";

/**
 * GET /api/auth/youtube
 *
 * Initiates the YouTube/Google OAuth flow.
 * Server function sets state cookie and returns Google authorization URL.
 */
export const Route = createFileRoute("/api/auth/youtube")({
  head: () => ({
    meta: [{ title: "YouTube Authorization — Hey5050" }],
  }),
  component: YouTubeOAuthInit,
});

function YouTubeOAuthInit() {
  useEffect(() => {
    initiateYouTubeOAuth()
      .then((result) => {
        if (result.success && result.authUrl) {
          window.location.href = result.authUrl;
        } else {
          window.location.href = `/api/auth/youtube/callback?error=${encodeURIComponent(result.error || "init_failed")}`;
        }
      })
      .catch(() => {
        window.location.href = "/api/auth/youtube/callback?error=server_error";
      });
  }, []);

  return null;
}
