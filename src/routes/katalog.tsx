import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookMarked, BookOpen, BookText, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { PageHero, SiteLayout } from "@/components/hey/SiteLayout";
import { HudChip, HudLabel, Panel, SectionHeading } from "@/components/hey/primitives";

export const Route = createFileRoute("/katalog")({
  head: () => ({
    meta: [
      { title: "Katalog Buku — Griya Pustaka Mandiri" },
      { name: "description", content: "Jelajahi katalog buku Griya Pustaka Mandiri berdasarkan kategori dan status penerbitan." },
      { property: "og:title", content: "Katalog Buku — Griya Pustaka Mandiri" },
      { property: "og:description", content: "Temukan karya dan informasi buku terbitan Griya Pustaka Mandiri." },
    ],
  }),
  component: Katalog,
});

const CATEGORIES = [
  { name: "Pendidikan", description: "Pembelajaran, pendidikan, dan buku ajar" },
  { name: "Sosial & Humaniora", description: "Masyarakat, budaya, dan kehidupan sosial" },
  { name: "Pekerjaan Sosial", description: "Praktik, rehabilitasi, dan pemberdayaan" },
  { name: "Pengembangan Masyarakat", description: "Partisipasi, komunitas, dan pembangunan" },
  { name: "Kebijakan Publik", description: "Kebijakan, tata kelola, dan pelayanan publik" },
  { name: "Ilmu Pemerintahan", description: "Pemerintahan, administrasi, dan demokrasi" },
  { name: "Ekonomi & Bisnis", description: "Kewirausahaan, manajemen, dan ekonomi" },
  { name: "Agama & Spiritualitas", description: "Kajian keagamaan dan nilai spiritual" },
  { name: "Psikologi", description: "Perilaku, perkembangan, dan kesejahteraan" },
  { name: "Sastra & Literatur", description: "Esai, puisi, cerita, dan karya kreatif" },
  { name: "Kesehatan", description: "Kesehatan masyarakat dan kesejahteraan" },
  { name: "Teknologi", description: "Inovasi, sistem informasi, dan teknologi" },
];

const STATUS_FILTERS = ["Semua", "Telah Terbit", "Segera Terbit"] as const;

function Katalog() {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua Kategori");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("Semua");

  const visibleCategories = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("id");
    return CATEGORIES.filter((category) => {
      const matchesQuery = !normalized ||
        category.name.toLocaleLowerCase("id").includes(normalized) ||
        category.description.toLocaleLowerCase("id").includes(normalized);
      const matchesCategory = selectedCategory === "Semua Kategori" || category.name === selectedCategory;
      return matchesQuery && matchesCategory;
    });
  }, [query, selectedCategory]);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Katalog Buku"
        title="Jelajahi gagasan, temukan bacaan"
        description="Katalog Griya Pustaka Mandiri dirancang untuk membantu pembaca menjelajahi buku berdasarkan bidang, tema, dan status penerbitannya. Daftar judul akan ditambahkan setelah informasi buku resmi tersedia."
      />
      <section className="section">
        <div className="shell">
          <Panel className="relative overflow-hidden p-6 md:p-8">
            <div aria-hidden className="absolute inset-0 atmosphere opacity-40" />
            <div className="relative">
              <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div>
                  <HudLabel>Temukan Buku</HudLabel>
                  <h2 className="mt-2 text-2xl font-semibold">Cari berdasarkan topik</h2>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">Gunakan pencarian atau pilih kategori untuk menyaring bidang katalog.</p>
                </div>
                <div className="relative w-full md:max-w-sm">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Cari kategori atau topik..." aria-label="Cari kategori atau topik buku" className="h-11 w-full rounded-xl border border-border bg-background/70 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60" />
                </div>
              </div>
              <div className="mt-7 flex flex-wrap items-center gap-2" aria-label="Filter status buku">
                <span className="mr-1 inline-flex items-center gap-2 text-xs text-muted-foreground"><SlidersHorizontal className="size-3.5" /> Status:</span>
                {STATUS_FILTERS.map((item) => (
                  <button key={item} type="button" onClick={() => setStatus(item)} aria-pressed={status === item} className={`rounded-full border px-3.5 py-2 text-xs transition-colors ${status === item ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>{item}</button>
                ))}
              </div>
            </div>
          </Panel>

          <div className="mt-12">
            <SectionHeading eyebrow="Bidang Katalog" title="Pilih bidang yang ingin Anda jelajahi" description="Kategori ini merupakan struktur awal katalog dan bukan pernyataan bahwa setiap kategori sudah memiliki judul buku terbit." />
            <div className="mt-8 flex flex-wrap gap-2">
              <button type="button" onClick={() => setSelectedCategory("Semua Kategori")} aria-pressed={selectedCategory === "Semua Kategori"} className={`rounded-full border px-4 py-2.5 text-sm transition-colors ${selectedCategory === "Semua Kategori" ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>Semua Kategori</button>
              {CATEGORIES.map((category) => (
                <button key={category.name} type="button" onClick={() => setSelectedCategory(category.name)} aria-pressed={selectedCategory === category.name} className={`rounded-full border px-4 py-2.5 text-sm transition-colors ${selectedCategory === category.name ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>{category.name}</button>
              ))}
            </div>
            {visibleCategories.length > 0 ? (
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleCategories.map((category, index) => (
                  <Panel key={category.name} interactive className="group flex h-full flex-col gap-5 p-5 md:p-6">
                    <div className="flex items-start justify-between">
                      <span className="grid size-11 place-items-center rounded-xl border border-border bg-surface/70 text-primary">{index % 3 === 0 ? <BookOpen className="size-5" /> : index % 3 === 1 ? <BookText className="size-5" /> : <BookMarked className="size-5" />}</span>
                      <span className="font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                    </div>
                    <div><h3 className="text-lg font-semibold">{category.name}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{category.description}</p></div>
                    <div className="mt-auto border-t border-border pt-4"><span className="text-xs text-muted-foreground">Kategori katalog</span></div>
                  </Panel>
                ))}
              </div>
            ) : (
              <Panel className="mt-8 p-8 text-center">
                <Search className="mx-auto size-7 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Kategori tidak ditemukan</h3>
                <p className="mt-2 text-sm text-muted-foreground">Coba kata kunci lain atau tampilkan semua kategori.</p>
                <Button variant="glass" className="mt-5" onClick={() => { setQuery(""); setSelectedCategory("Semua Kategori"); }}>Reset pencarian</Button>
              </Panel>
            )}
          </div>

          <section className="mt-16">
            <div className="mb-7">
              <HudChip tone="active">Status Katalog</HudChip>
              <h2 className="mt-4 text-2xl font-semibold sm:text-3xl">{status === "Semua" ? "Koleksi buku" : status}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {status === "Telah Terbit" ? "Bagian ini akan menampilkan buku yang sudah terbit dan memiliki informasi publikasi terverifikasi." : status === "Segera Terbit" ? "Bagian ini akan menampilkan buku yang sedang dipersiapkan atau dijadwalkan terbit setelah informasinya dikonfirmasi." : "Katalog judul sedang disiapkan. Hanya buku dengan informasi yang sudah dikonfirmasi yang akan ditampilkan di sini."}
              </p>
            </div>
            <Panel className="relative overflow-hidden p-8 text-center md:p-12">
              <div aria-hidden className="absolute inset-0 atmosphere opacity-50" />
              <div className="relative mx-auto flex max-w-xl flex-col items-center">
                <span className="grid size-16 place-items-center rounded-2xl border border-border bg-background/70 text-primary"><BookOpen className="size-7" /></span>
                <h3 className="mt-5 text-xl font-semibold">Katalog perdana sedang disiapkan</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Belum ada judul buku yang dipublikasikan pada katalog ini. Kami akan menambahkan sampul, judul, penulis, ISBN, format, dan informasi pemesanan setelah datanya siap.</p>
                <Button asChild variant="hero" size="lg" className="mt-6"><Link to="/contact">Tanyakan Informasi Buku <ArrowRight /></Link></Button>
              </div>
            </Panel>
          </section>
        </div>
      </section>
    </SiteLayout>
  );
}
