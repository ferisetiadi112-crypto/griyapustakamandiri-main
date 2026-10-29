import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

import { DashboardLayout } from "@/components/hey/DashboardLayout";
import { HudChip, HudLabel, Panel } from "@/components/hey/primitives";

export const Route = createFileRoute("/dashboard/create")({
  head: () => ({
    meta: [
      { title: "Create — Hey5050 Console" },
      {
        name: "description",
        content: "Content creation in the Hey5050 console.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <DashboardLayout
      title="Create"
      description="Prepare and produce digital content."
    >
      <div className="flex flex-wrap items-center gap-3">
        <HudChip>Content Creation</HudChip>
        <HudLabel>Not yet available</HudLabel>
      </div>

      <Panel className="flex flex-col items-center gap-4 p-12 text-center">
        <Sparkles className="size-10 text-muted-foreground/40" />
        <div>
          <h3 className="text-sm font-semibold">Content creation not available yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            AI-powered content creation, script generation, and video
            preparation will be available in a future phase.
          </p>
        </div>
      </Panel>
    </DashboardLayout>
  );
}
