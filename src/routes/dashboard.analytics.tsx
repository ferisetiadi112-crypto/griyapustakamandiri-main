import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";

import { DashboardLayout } from "@/components/hey/DashboardLayout";
import { HudChip, HudLabel, Panel } from "@/components/hey/primitives";

export const Route = createFileRoute("/dashboard/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Hey5050 Console" },
      {
        name: "description",
        content: "TikTok analytics dashboard in the Hey5050 console.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <DashboardLayout
      title="Analytics"
      description="Performance intelligence and content signals."
    >
      <div className="flex flex-wrap items-center gap-3">
        <HudChip>Analytics</HudChip>
        <HudLabel>Not yet available</HudLabel>
      </div>

      <Panel className="flex flex-col items-center gap-4 p-12 text-center">
        <BarChart3 className="size-10 text-muted-foreground/40" />
        <div>
          <h3 className="text-sm font-semibold">Analytics not available yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            TikTok analytics will be displayed here once the analytics API
            integration is implemented in a future phase.
          </p>
        </div>
      </Panel>
    </DashboardLayout>
  );
}
