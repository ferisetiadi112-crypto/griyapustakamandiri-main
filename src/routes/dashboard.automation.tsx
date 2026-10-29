import { createFileRoute } from "@tanstack/react-router";
import { Workflow } from "lucide-react";

import { DashboardLayout } from "@/components/hey/DashboardLayout";
import { HudChip, HudLabel, Panel } from "@/components/hey/primitives";

export const Route = createFileRoute("/dashboard/automation")({
  head: () => ({
    meta: [
      { title: "Automation — Hey5050 Console" },
      {
        name: "description",
        content: "Automation workflows in the Hey5050 console.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <DashboardLayout
      title="Automation"
      description="Workflows, triggers and scheduled routines."
    >
      <div className="flex flex-wrap items-center gap-3">
        <HudChip>Automation</HudChip>
        <HudLabel>Not yet available</HudLabel>
      </div>

      <Panel className="flex flex-col items-center gap-4 p-12 text-center">
        <Workflow className="size-10 text-muted-foreground/40" />
        <div>
          <h3 className="text-sm font-semibold">Automation not available yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Content scheduling, automation workflows, and AI-driven posting
            will be implemented in a future phase.
          </p>
        </div>
      </Panel>
    </DashboardLayout>
  );
}
