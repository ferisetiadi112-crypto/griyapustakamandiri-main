import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getAdminSession } from "@/lib/admin-auth";
import { getUserSession } from "@/lib/publishing-platform";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const adminSession = await getAdminSession();
    if (adminSession.authenticated) return;
    const userSession = await getUserSession();
    const allowedRoles = ["editor", "finance", "admin", "leadership"];
    if (userSession.user && userSession.user.roles.some((role) => allowedRoles.includes(role))) return;
    throw redirect({ to: "/login" });
  },
  component: () => <Outlet />,
});
