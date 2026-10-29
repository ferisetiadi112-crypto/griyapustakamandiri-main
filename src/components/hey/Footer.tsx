import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/hey/Logo";
import { StatusDot } from "@/components/hey/primitives";

const GROUPS = [
  {
    title: "Platform",
    links: [
      { to: "/how-it-works", label: "How It Works" },
      { to: "/technology", label: "Technology" },
      { to: "/future", label: "Future" },
    ],
  },
  {
    title: "Company",
    links: [
      { to: "/about", label: "About" },
      { to: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Integrations",
    links: [
      { to: "/integrations/tiktok", label: "TikTok Integration" },
      { to: "/login", label: "Console Access" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="relative border-t border-border">
      <div className="shell grid gap-12 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)] md:py-16">
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            Technology from the future, designed for humans today.
          </p>
          <StatusDot label="All systems online" />
        </div>
        {GROUPS.map((group) => (
          <div key={group.title} className="flex flex-col gap-3">
            <h3 className="hud-label">{group.title}</h3>
            {group.links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className="shell flex flex-col gap-2 border-t border-border py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Griya Pustaka Mandiri. Orbital Systems Division.</p>
        <p className="font-mono tracking-widest uppercase">Sector 5050 · Build 0.1</p>
      </div>
    </footer>
  );
}
