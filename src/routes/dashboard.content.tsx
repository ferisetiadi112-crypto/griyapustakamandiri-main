import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";

import { DashboardLayout } from "@/components/hey/DashboardLayout";
import { HudChip, HudLabel, Panel } from "@/components/hey/primitives";

export const Route = createFileRoute("/dashboard/content")({
  head: () => ({
    meta: [
      { title: "Content — Hey5050 Console" },
      {
        name: "description",
        content: "Content library in the Hey5050 console.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <DashboardLayout
      title="Content"
      description="Your content library, drafts and publishing states."
    >
      <div className="flex flex-wrap items-center gap-3">
        <HudChip>Content Library</HudChip>
        <HudLabel>Not yet available</HudLabel>
      </div>

      <Panel className="flex flex-col items-center gap-4 p-12 text-center">
        <FileText className="size-10 text-muted-foreground/40" />
        <div>
          <h3 className="text-sm font-semibold">No content yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Content creation, planning, and management will be available
            once the content system is implemented in a future phase.
          </p>
        </div>
      </Panel>
    </DashboardLayout>
  );
}
