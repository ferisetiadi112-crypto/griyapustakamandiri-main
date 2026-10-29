import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, ChartNoAxesCombined, FileSignature, FileText, LayoutDashboard, Menu, ShoppingBag, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/hey/Logo";
import { StatusDot } from "@/components/hey/primitives";

const NAV = [
  { to: "/dashboard", label: "Ringkasan", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/katalog", label: "Katalog Buku", icon: BookOpen },
  { to: "/dashboard/pengajuan", label: "Pengajuan Naskah", icon: FileText },
  { to: "/dashboard/kontrak", label: "Kontrak & Produksi", icon: FileSignature },
  { to: "/dashboard/pesanan", label: "Pesanan Buku", icon: ShoppingBag },
  { to: "/dashboard/pengguna", label: "Pengguna", icon: Users },
  { to: "/dashboard/royalti", label: "Royalti & Laporan", icon: ChartNoAxesCombined },
] as const;

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return <nav className="flex flex-col gap-1" aria-label="Navigasi dashboard penerbit">
    {NAV.map((item) => <Link key={item.to} to={item.to} activeOptions={{ exact: "exact" in item ? item.exact : false }} activeProps={{ className: "bg-sidebar-accent text-primary border-primary/35" }} onClick={onNavigate} className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"><item.icon className="size-4 shrink-0" strokeWidth={1.5}/><span className="truncate">{item.label}</span></Link>)}
  </nav>;
}
export function DashboardLayout({title,description,children}:{title:string;description?:string;children:ReactNode}) {
  const [open,setOpen]=useState(false);
  return <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
    <aside className="hidden border-r border-sidebar-border bg-sidebar lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
      <div className="border-b border-sidebar-border p-5"><Link to="/"><Logo/></Link><p className="mt-3 text-xs text-muted-foreground">Panel Penerbit</p></div>
      <div className="flex-1 overflow-y-auto p-4"><NavList/></div>
      <div className="border-t border-sidebar-border p-5"><StatusDot label="Griya Pustaka Mandiri" tone="idle"/></div>
    </aside>
    <div className="flex min-w-0 flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl"><div className="flex items-center justify-between gap-4 px-5 py-3.5 md:px-8"><div className="flex items-center gap-3"><Button variant="glass" size="icon" className="lg:hidden" aria-label={open?"Tutup menu":"Buka menu"} aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?<X/>:<Menu/>}</Button><span className="lg:hidden"><Logo/></span><span className="hidden lg:inline-block"><StatusDot label="Panel Operasional Penerbit" tone="idle"/></span></div><Link to="/" className="text-sm text-muted-foreground hover:text-foreground">Lihat Website</Link></div>{open&&<div className="border-t border-border bg-background/95 p-4 lg:hidden"><NavList onNavigate={()=>setOpen(false)}/></div>}</header>
      <main className={cn("min-w-0 flex-1 px-5 py-8 md:px-8 md:py-10")}><div className="mx-auto flex max-w-6xl flex-col gap-8"><div className="animate-rise"><h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>{description&&<p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>}</div>{children}</div></main>
    </div>
  </div>;
}
