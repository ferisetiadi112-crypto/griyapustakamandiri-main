import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookMarked, BookOpen, BookText, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { getCatalogBooks } from "@/lib/catalog-books";
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
  loader: async () => getCatalogBooks(),
  component: Katalog,
});

const CATEGORIES = [
  { name: "Administrasi" },
  { name: "Agama" },
  { name: "Agama Islam" },
  { name: "AI" },
  { name: "Akuntansi" },
  { name: "Antologi" },
  { name: "Antropologi" },
  { name: "Arsitektur" },
  { name: "Bahasa" },
  { name: "Biografi" },
  { name: "Biologi" },
  { name: "Bisnis" },
  { name: "Branding" },
  { name: "Budaya" },
  { name: "Buku Anak" },
  { name: "Cerpen" },
  { name: "Digital Marketing" },
  { name: "EISBN" },
  { name: "Ekonomi" },
  { name: "Featured" },
  { name: "Filsafat" },
  { name: "Fisika" },
  { name: "Fotografi" },
  { name: "Geografi" },
  { name: "Geologi" },
  { name: "Hukum" },
  { name: "Ilmu Alam" },
  { name: "Informatika" },
  { name: "IPAS" },
  { name: "K3" },
  { name: "Kedokteran" },
  { name: "Kehutanan" },
  { name: "Kelautan" },
  { name: "Keperawatan" },
  { name: "Kesehatan" },
  { name: "Keterampilan" },
  { name: "Keuangan" },
  { name: "Kimia" },
  { name: "Komputasi" },
  { name: "Komputer" },
  { name: "Komunikasi" },
  { name: "Kriminologi" },
  { name: "Manajemen" },
  { name: "Marketing" },
  { name: "Matematika" },
  { name: "Mesin" },
  { name: "Motivasi" },
  { name: "Novel" },
  { name: "Olahraga" },
  { name: "Parenting" },
  { name: "Pariwisata" },
  { name: "Pendidikan" },
  { name: "Penelitian" },
  { name: "Pengembangan Diri" },
  { name: "Perikanan" },
  { name: "Pertanian" },
  { name: "Peternakan" },
  { name: "PKn" },
  { name: "Politik" },
  { name: "Psikologi" },
  { name: "Puisi" },
  { name: "QRCBN" },
  { name: "Sains" },
  { name: "Sastra" },
  { name: "SDM" },
  { name: "Segera Terbit" },
  { name: "Sejarah" },
  { name: "Seni" },
  { name: "Sistem Informasi" },
  { name: "Sosial" },
  { name: "Sosiologi" },
  { name: "Statistik" },
  { name: "Teknik" },
  { name: "Teknik Elektro" },
  { name: "Teknik Industri" },
  { name: "Teknik Komputer" },
  { name: "Teknik Mesin" },
  { name: "Teknik Pangan" },
  { name: "Teknik Sipil" },
  { name: "Teknologi" },
  { name: "Telah Terbit" },
  { name: "Uncategorized" },
];

const STATUS_FILTERS = ["Semua", "Telah Terbit", "Segera Terbit"] as const;

function Katalog() {
  const catalogData = Route.useLoaderData();
  const books = catalogData.success ? catalogData.books : [];
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua Kategori");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("Semua");

  const visibleCategories = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("id");
    return CATEGORIES.filter((category) => {
      const matchesQuery = !normalized ||
        category.name.toLocaleLowerCase("id").includes(normalized) ||
        category.name.toLocaleLowerCase("id").includes(normalized);
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

          <div className="mt-12 grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="self-start lg:sticky lg:top-28" aria-label="Navigasi kategori buku">
              <Panel className="overflow-hidden p-0">
                <div className="border-b border-border px-5 py-4">
                  <HudLabel>Kategori Buku</HudLabel>
                  <h2 className="mt-1 text-lg font-semibold">Jelajahi bidang</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Pilih kategori untuk menyaring koleksi buku.</p>
                </div>
                <div className="max-h-[70vh] overflow-y-auto p-2">
                  <button type="button" onClick={() => setSelectedCategory("Semua Kategori")} aria-pressed={selectedCategory === "Semua Kategori"} className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${selectedCategory === "Semua Kategori" ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"}`}>
                    <span>Semua Kategori</span>
                    {selectedCategory === "Semua Kategori" && <span aria-hidden="true">✓</span>}
                  </button>
                  {CATEGORIES.map((category) => (
                    <button key={category.name} type="button" onClick={() => setSelectedCategory(category.name)} aria-pressed={selectedCategory === category.name} className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${selectedCategory === category.name ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"}`}>
                      <span>{category.name}</span>
                      {selectedCategory === category.name && <span aria-hidden="true">✓</span>}
                    </button>
                  ))}
                </div>
              </Panel>
            </aside>

            <div className="min-w-0">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <HudChip tone="active">Katalog Buku</HudChip>
                  <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">{selectedCategory === "Semua Kategori" ? "Koleksi buku" : selectedCategory}</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2" aria-label="Filter status buku">
                  <span className="mr-1 inline-flex items-center gap-2 text-xs text-muted-foreground"><SlidersHorizontal className="size-3.5" /> Status:</span>
                  {STATUS_FILTERS.map((item) => (
                    <button key={item} type="button" onClick={() => setStatus(item)} aria-pressed={status === item} className={`rounded-full border px-3.5 py-2 text-xs transition-colors ${status === item ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>{item}</button>
                  ))}
                </div>
              </div>
              <div className="relative w-full mb-6">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Cari judul, penulis, atau topik buku..." aria-label="Cari judul, penulis, atau topik buku" className="h-11 w-full rounded-xl border border-border bg-background/70 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60" />
              </div>
              {(() => {
                const normalized = query.trim().toLocaleLowerCase("id");
                const visibleBooks = books.filter((book) => {
                  const matchesStatus = status === "Semua" || (status === "Telah Terbit" ? book.status === "published" : book.status === "upcoming");
                  const matchesCategory = selectedCategory === "Semua Kategori" || book.category.toLocaleLowerCase("id") === selectedCategory.toLocaleLowerCase("id");
                  const matchesQuery = !normalized || [book.title, book.author, book.category, book.synopsis].some((value) => value.toLocaleLowerCase("id").includes(normalized));
                  return matchesStatus && matchesCategory && matchesQuery;
                });
                return visibleBooks.length ? (
                  <>
                    <p className="mb-4 text-sm text-muted-foreground">{visibleBooks.length} buku ditemukan</p>
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                      {visibleBooks.map((book) => (
                        <Panel key={book.id} className="overflow-hidden p-0">
                          {book.coverUrl ? <img src={book.coverUrl} alt={`Sampul buku ${book.title}`} loading="lazy" className="h-64 w-full border-b border-border object-contain bg-secondary/30 p-3" /> : <div className="grid h-64 place-items-center border-b border-border bg-secondary/30"><BookOpen className="size-12 text-muted-foreground/50" /></div>}
                          <div className="p-5">
                            <div className="flex flex-wrap items-center gap-2"><HudChip tone={book.status === "published" ? "active" : undefined}>{book.status === "published" ? "Telah Terbit" : "Segera Terbit"}</HudChip><span className="text-xs text-muted-foreground">{book.category}</span></div>
                            <h3 className="mt-3 text-lg font-semibold">{book.title}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">Oleh {book.author}</p>
                            {book.synopsis && <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-muted-foreground">{book.synopsis}</p>}
                            <div className="mt-4 space-y-1 text-xs text-muted-foreground"><p>ISBN: {book.isbn || "Dalam proses / belum tersedia"}</p><p>Format: {book.format}{book.price ? ` · ${book.price}` : ""}</p></div>
                            {book.orderInfo && <p className="mt-3 text-sm font-medium text-primary">{book.orderInfo}</p>}
                            <Button asChild variant="glass" className="mt-4 w-full"><Link to="/contact">Tanyakan Buku <ArrowRight /></Link></Button>
                          </div>
                        </Panel>
                      ))}
                    </div>
                  </>
                ) : (
                  <Panel className="relative overflow-hidden p-8 text-center md:p-12">
                    <div aria-hidden className="absolute inset-0 atmosphere opacity-50" />
                    <div className="relative mx-auto flex max-w-xl flex-col items-center">
                      <span className="grid size-16 place-items-center rounded-2xl border border-border bg-background/70 text-primary"><BookOpen className="size-7" /></span>
                      <h3 className="mt-5 text-xl font-semibold">{catalogData.success ? "Belum ada buku pada filter ini" : "Katalog belum dapat dimuat"}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{catalogData.success ? "Buku yang ditambahkan melalui panel admin akan tampil di sini setelah disimpan." : "Data katalog sementara tidak dapat diakses. Silakan coba kembali nanti."}</p>
                      {!catalogData.success && <Button asChild variant="hero" size="lg" className="mt-6"><Link to="/contact">Tanyakan Informasi Buku <ArrowRight /></Link></Button>}
                    </div>
                  </Panel>
                );
              })()}
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
