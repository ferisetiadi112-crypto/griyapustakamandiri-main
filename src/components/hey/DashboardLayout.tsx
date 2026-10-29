import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  Bot,
  Bell,
  FileText,
  LayoutDashboard,
  Menu,
  Music2,
  Plug,
  Settings,
  Sparkles,
  Workflow,
  X,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/hey/Logo";
import { StatusDot } from "@/components/hey/primitives";
import { getPrimaryAccountFn } from "@/lib/account/primary-account-fns";

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/accounts/tiktok/workspace", label: "TikTok Workspace", icon: Music2 },
  { to: "/dashboard/create", label: "Create", icon: Sparkles },
  { to: "/dashboard/automation", label: "Automation", icon: Workflow },
  { to: "/dashboard/content", label: "Content", icon: FileText },
  { to: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Console">
      {NAV.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          activeOptions={{ exact: "exact" in item ? item.exact : false }}
          activeProps={{ className: "bg-sidebar-accent text-primary border-primary/35" }}
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
        >
          <item.icon className="size-4 shrink-0" strokeWidth={1.5} />
          <span className="truncate">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

function TopBarSession() {
  const [username, setUsername] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const fetchAccount = useServerFn(getPrimaryAccountFn);

  useEffect(() => {
    fetchAccount()
      .then((data) => {
        if (data) {
          const account = data as { username?: string | null; displayName?: string | null; avatarUrl?: string | null; status?: string };
          setUsername(account.username ?? null);
          setDisplayName(account.displayName ?? null);
          setAvatarUrl(account.avatarUrl ?? null);
          setConnected(account.status === "connected");
        }
      })
      .catch(() => {
        setConnected(false);
      });
  }, [fetchAccount]);

  const initials = connected
    ? (displayName ?? username ?? "TK")
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "—";

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button variant="quiet" size="icon" aria-label="Notifications">
        <Bell />
      </Button>
      <Link to="/accounts/tiktok/workspace">
        <span className="hidden items-center gap-2.5 rounded-full border border-border py-1 pl-1 pr-3.5 sm:flex hover:bg-surface/50 transition-colors">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="size-7 rounded-full border border-border object-cover"
            />
          ) : (
            <span className="grid size-7 place-items-center rounded-full bg-secondary text-xs font-semibold">
              {initials}
            </span>
          )}
          <span className="text-sm">
            {connected
              ? `@${username ?? "connected"}`
              : "Not connected"}
          </span>
          {connected && (
            <Bot className="size-3 text-primary" />
          )}
        </span>
      </Link>
    </div>
  );
}

export function DashboardLayout({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Sidebar */}
      <aside className="hidden border-r border-sidebar-border bg-sidebar lg:flex lg:h-screen lg:flex-col lg:sticky lg:top-0">
        <div className="border-b border-sidebar-border p-5">
          <Link to="/">
            <Logo />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <NavList />
        </div>
        <div className="border-t border-sidebar-border p-5">
          <StatusDot label="System online" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3.5 md:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                variant="glass"
                size="icon"
                className="lg:hidden"
                aria-label={open ? "Close console menu" : "Open console menu"}
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
              >
                {open ? <X /> : <Menu />}
              </Button>
              <span className="lg:hidden">
                <Logo />
              </span>
              <span className="hidden lg:inline-block">
                <StatusDot label="All subsystems nominal" />
              </span>
            </div>
            <TopBarSession />
          </div>

          {open && (
            <div className="border-t border-border bg-background/95 p-4 lg:hidden">
              <NavList onNavigate={() => setOpen(false)} />
            </div>
          )}
        </header>

        <main className={cn("min-w-0 flex-1 px-5 py-8 md:px-8 md:py-10")}>
          <div className="mx-auto flex max-w-6xl flex-col gap-8">
            <div className="animate-rise">
              <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
              {description && (
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
              )}
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
