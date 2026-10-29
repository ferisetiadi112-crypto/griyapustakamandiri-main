import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, BookMarked, ExternalLink, LogOut, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/hey/DashboardLayout";
import { HudChip, HudLabel, Panel } from "@/components/hey/primitives";
import { logoutAdmin, getAdminSession } from "@/lib/admin-auth";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      { title: "Panel Admin — Griya Pustaka Mandiri" },
      { name: "description", content: "Panel administrator untuk mengelola katalog buku dan koleksi e-book Griya Pustaka Mandiri." },
    ],
  }),
  loader: async () => getAdminSession(),
  component: AdminDashboard,
});

function AdminDashboard() {
  const session = Route.useLoaderData();
  const navigate = useNavigate();
  const logout = useServerFn(logoutAdmin);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      await navigate({ to: "/login" });
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <DashboardLayout
      title="Panel Administrator"
      description="Kelola katalog buku dan koleksi e-book Griya Pustaka Mandiri."
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <HudChip tone="active"><ShieldCheck className="size-3.5" /> Sesi Admin Aktif</HudChip>
          <HudLabel>{session.username ? `Login sebagai ${session.username}` : "Administrator"}</HudLabel>
        </div>
        <Button variant="glass" size="sm" onClick={handleLogout} disabled={loggingOut}>
          <LogOut className="size-4" /> {loggingOut ? "Keluar..." : "Keluar"}
        </Button>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Panel className="flex flex-col gap-4 p-6">
          <span className="grid size-12 place-items-center rounded-2xl border border-border bg-primary/10 text-primary"><BookOpen className="size-6" /></span>
          <div>
            <HudLabel>Manajemen Konten</HudLabel>
            <h2 className="mt-2 text-xl font-semibold">Katalog Buku</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Kelola informasi buku, penulis, ISBN, kategori, sampul, status terbit, dan informasi pemesanan.</p>
          </div>
          <div className="mt-auto flex flex-wrap gap-2 pt-2">
            <Button asChild variant="hero"><Link to="/dashboard/katalog">Kelola Katalog</Link></Button>
            <Button asChild variant="glass"><Link to="/katalog">Lihat Halaman Publik <ExternalLink className="size-3.5" /></Link></Button>
          </div>
        </Panel>

        <Panel className="flex flex-col gap-4 p-6">
          <span className="grid size-12 place-items-center rounded-2xl border border-border bg-primary/10 text-primary"><BookMarked className="size-6" /></span>
          <div>
            <HudLabel>Manajemen Konten</HudLabel>
            <h2 className="mt-2 text-xl font-semibold">Koleksi E-book</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Kelola judul e-book, penulis, deskripsi, sampul, format, serta tautan baca atau unduh.</p>
          </div>
          <div className="mt-auto flex flex-wrap gap-2 pt-2">
            <Button asChild variant="hero"><Link to="/dashboard/e-book">Kelola E-book</Link></Button>
            <Button asChild variant="glass"><Link to="/e-book">Lihat Halaman Publik <ExternalLink className="size-3.5" /></Link></Button>
          </div>
        </Panel>
      </div>

      <Panel className="p-5">
        <HudLabel>Keamanan</HudLabel>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Panel ini hanya dapat diakses dengan sesi administrator yang valid. Gunakan tombol Keluar saat selesai. Pendaftaran akun publik tidak tersedia.</p>
      </Panel>
    </DashboardLayout>
  );
}
