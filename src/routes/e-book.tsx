import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Download, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHero, SiteLayout } from "@/components/hey/SiteLayout";
import { HudChip, HudLabel, Panel, SectionHeading } from "@/components/hey/primitives";

export const Route = createFileRoute("/e-book")({
  head: () => ({
    meta: [
      { title: "E-book — Griya Pustaka Mandiri" },
      { name: "description", content: "Jelajahi koleksi e-book Griya Pustaka Mandiri dalam format digital." },
      { property: "og:title", content: "E-book — Griya Pustaka Mandiri" },
      { property: "og:description", content: "Koleksi buku digital dari Griya Pustaka Mandiri." },
    ],
  }),
  component: Ebook,
});

function Ebook() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Perpustakaan Digital"
        title="Bacaan berkualitas, dalam genggaman"
        description="Halaman e-book Griya Pustaka Mandiri akan menjadi ruang untuk menemukan dan membaca karya dalam format digital. Informasi judul dan akses akan ditampilkan setelah koleksi siap dipublikasikan."
      />
      <section className="section">
        <div className="shell">
          <SectionHeading
            eyebrow="Koleksi Digital"
            title="Temukan bacaan untuk dibawa ke mana saja"
            description="E-book dapat membantu pembaca mengakses pengetahuan dengan praktis melalui ponsel, tablet, atau komputer."
          />
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <Panel className="flex flex-col gap-3 p-6">
              <span className="grid size-11 place-items-center rounded-xl border border-border bg-surface/70 text-primary"><BookOpen className="size-5" /></span>
              <h3 className="font-semibold">Koleksi terkurasi</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">Informasi buku digital akan disertai judul, penulis, deskripsi, dan format yang tersedia.</p>
            </Panel>
            <Panel className="flex flex-col gap-3 p-6">
              <span className="grid size-11 place-items-center rounded-xl border border-border bg-surface/70 text-primary"><Smartphone className="size-5" /></span>
              <h3 className="font-semibold">Mudah diakses</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">Rancangannya responsif agar nyaman dibuka melalui ponsel maupun layar komputer.</p>
            </Panel>
            <Panel className="flex flex-col gap-3 p-6">
              <span className="grid size-11 place-items-center rounded-xl border border-border bg-surface/70 text-primary"><Download className="size-5" /></span>
              <h3 className="font-semibold">Informasi akses jelas</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">Tautan baca atau unduh hanya akan tersedia untuk judul yang telah siap dan memiliki izin distribusi.</p>
            </Panel>
          </div>
          <Panel className="relative mt-8 overflow-hidden p-8 text-center md:p-12">
            <div aria-hidden className="absolute inset-0 atmosphere opacity-40" />
            <div className="relative mx-auto flex max-w-xl flex-col items-center">
              <HudChip tone="active">Segera Hadir</HudChip>
              <span className="mt-5 grid size-16 place-items-center rounded-2xl border border-border bg-background/70 text-primary"><BookOpen className="size-7" /></span>
              <HudLabel className="mt-5">Koleksi E-book</HudLabel>
              <h2 className="mt-2 text-2xl font-semibold">Koleksi digital sedang disiapkan</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Saat ini belum ada judul e-book yang dipublikasikan pada halaman ini. Kami akan menambahkan sampul, penulis, deskripsi, format, dan informasi akses setelah data buku terverifikasi.</p>
              <Button asChild variant="hero" size="lg" className="mt-6"><Link to="/contact">Tanyakan E-book <ArrowRight /></Link></Button>
            </div>
          </Panel>
        </div>
      </section>
    </SiteLayout>
  );
}
