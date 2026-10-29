import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/hey/Logo";

const NAV = [
  { to: "/", label: "Beranda" },
  { to: "/about", label: "Tentang Kami" },
  { to: "/paket-penerbitan", label: "Paket Penerbitan" },
  { to: "/contact", label: "Kontak" },
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="shell grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3.5 lg:flex lg:justify-between">
        <Link to="/" className="flex min-w-0 items-center" onClick={() => setOpen(false)}>
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigasi utama">
          {NAV.map((item) => item.to === "/paket-penerbitan" ? (
            <a key={item.to} href={item.to} className="rounded-lg px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground">{item.label}</a>
          ) : (
            <Link key={item.to} to={item.to} activeOptions={{ exact: item.to === "/" }} activeProps={{ className: "text-primary bg-secondary/60" }} className="rounded-lg px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground">{item.label}</Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <Button asChild variant="quiet" size="sm"><Link to="/login">Masuk</Link></Button>
          <Button asChild variant="hero" size="sm"><Link to="/paket-penerbitan" onClick={() => setOpen(false)}><span>Lihat Paket</span></Link></Button>
        </div>
        <Button variant="glass" size="icon" className="lg:hidden" aria-label={open ? "Tutup menu" : "Buka menu"} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? <X /> : <Menu />}
        </Button>
      </div>
      {open && (
        <div className="border-t border-border bg-background/95 lg:hidden">
          <nav className="shell flex flex-col gap-1 py-4" aria-label="Navigasi seluler">
            {NAV.map((item) => item.to === "/paket-penerbitan" ? (
              <a key={item.to} href={item.to} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-base text-muted-foreground transition-colors hover:text-foreground">{item.label}</a>
            ) : (
              <Link key={item.to} to={item.to} activeOptions={{ exact: item.to === "/" }} activeProps={{ className: "text-primary" }} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-base text-muted-foreground transition-colors hover:text-foreground">{item.label}</Link>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button asChild variant="glass" onClick={() => setOpen(false)}><Link to="/login">Masuk</Link></Button>
              <Button asChild variant="hero" onClick={() => setOpen(false)}><a href="/paket-penerbitan">Lihat Paket</a></Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
