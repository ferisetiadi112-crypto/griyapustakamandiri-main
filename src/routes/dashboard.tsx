import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getAdminSession } from "@/lib/admin-auth";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const session = await getAdminSession();
    if (!session.authenticated) {
      throw redirect({ to: "/login" });
    }
  },
  component: () => <Outlet />,
});
