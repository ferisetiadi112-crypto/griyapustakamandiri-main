import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Search, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { getCatalogBooks } from "@/lib/catalog-books";
import { SiteLayout } from "@/components/hey/SiteLayout";
import { HudLabel, Panel } from "@/components/hey/primitives";

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
  const [selectedBook, setSelectedBook] = useState<(typeof books)[number] | null>(null);

  return (
    <SiteLayout>
      <section className="border-b border-border bg-background/80 py-8 sm:py-10">
        <div className="shell">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Griya Pustaka Mandiri</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Katalog Buku</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Temukan buku berdasarkan kategori, penulis, dan status penerbitan.</p>
        </div>
      </section>
      <section className="section">
        <div className="shell">
          <div className="mt-6 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
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
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold sm:text-2xl">{selectedCategory === "Semua Kategori" ? "Koleksi buku" : selectedCategory}</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2" aria-label="Filter status buku">
                  <span className="mr-1 inline-flex items-center gap-2 text-xs text-muted-foreground"><SlidersHorizontal className="size-3.5" /> Status:</span>
                  {STATUS_FILTERS.map((item) => (
                    <button key={item} type="button" onClick={() => setStatus(item)} aria-pressed={status === item} className={`rounded-full border px-3.5 py-2 text-xs transition-colors ${status === item ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>{item}</button>
                  ))}
                </div>
              </div>
              <div className="relative mb-4 w-full">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Cari judul, penulis, atau topik buku..." aria-label="Cari judul, penulis, atau topik buku" className="h-10 w-full rounded-md border border-border bg-background/70 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60" />
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
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                      {visibleBooks.map((book) => (
                        <article key={book.id} className="overflow-hidden rounded-md border border-border bg-card transition-shadow hover:shadow-lg">
                          <button type="button" onClick={() => setSelectedBook(book)} className="block w-full overflow-hidden bg-white p-0" aria-label={`Lihat detail ${book.title}`}>
                            {book.coverUrl ? <img src={book.coverUrl} alt={`Sampul buku ${book.title}`} loading="lazy" className="aspect-[3/4] w-full scale-110 object-cover" /> : <div className="grid aspect-[3/4] place-items-center bg-secondary/30"><BookOpen className="size-10 text-muted-foreground/50" /></div>}
                          </button>
                          <div className="p-3">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-primary">{book.category}</p>
                            <h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-semibold leading-snug">{book.title}</h3>
                            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{book.authors?.length ? book.authors.map((person) => person.name).filter(Boolean).join(", ") : book.author}</p>
                            <p className="mt-2 text-xs text-muted-foreground">{book.status === "published" ? "Telah Terbit" : "Segera Terbit"}</p>
                            {book.price && <p className="mt-1 text-sm font-semibold">{book.price.toLowerCase().includes("rp") ? book.price : `Rp${book.price}`}</p>}
                            <button type="button" onClick={() => setSelectedBook(book)} className="mt-3 flex min-h-9 w-full items-center justify-center gap-1 rounded border border-border px-2 py-2 text-xs font-semibold transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary">Lihat Lebih Detail <ArrowRight className="size-3.5" /></button>
                          </div>
                        </article>
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
      {selectedBook && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" role="presentation" onClick={() => setSelectedBook(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="book-detail-title" className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-background p-5 shadow-2xl sm:p-7" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setSelectedBook(null)} aria-label="Tutup detail buku" className="absolute right-3 top-3 rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"><X className="size-5" /></button>
            <div className="grid gap-5 sm:grid-cols-[minmax(150px,220px)_1fr]">
              <div className="space-y-4">
                <div className="rounded-md bg-white p-3">
                  {selectedBook.coverUrl ? <img src={selectedBook.coverUrl} alt={`Sampul depan buku ${selectedBook.title}`} className="mx-auto max-h-[280px] w-full object-contain" /> : <div className="grid aspect-[3/4] place-items-center text-muted-foreground"><BookOpen className="size-12" /></div>}
                </div>
                {selectedBook.backCoverUrl && <div className="rounded-md bg-white p-3">
                  <img src={selectedBook.backCoverUrl} alt={`Sampul belakang buku ${selectedBook.title}`} className="mx-auto max-h-[280px] w-full object-contain" />
                </div>}
              </div>
              <div className="pt-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">{selectedBook.category}</p>
                <h2 id="book-detail-title" className="mt-2 pr-7 text-2xl font-bold">{selectedBook.title}</h2>
                <div className="mt-2 text-sm text-muted-foreground">
                  <span>Oleh: </span>
                  {(selectedBook.authors?.length ? selectedBook.authors : [{ name: selectedBook.author, doi: "" }]).filter((person) => person.name.trim()).map((person, index, list) => <span key={`${person.name}-${index}`} className="break-words">{person.name}{person.doi.trim() ? <span className="text-xs"> (DOI: {person.doi})</span> : null}{index < list.length - 1 ? ", " : ""}</span>)}
                </div>
                <p className="mt-3 text-sm">{selectedBook.status === "published" ? "Telah Terbit" : "Segera Terbit"}</p>
                {selectedBook.synopsis && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{selectedBook.synopsis.length > 350 ? `${selectedBook.synopsis.slice(0, 350).trimEnd()}…` : selectedBook.synopsis}</p>}
                <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                  <p><span className="text-muted-foreground">ISBN:</span> {selectedBook.isbn || "Dalam proses / belum tersedia"}</p>
                  <p><span className="text-muted-foreground">QRCBN:</span> {selectedBook.qrcbn || "Belum tersedia"}</p>
                  <p><span className="text-muted-foreground">Format:</span> {selectedBook.format}</p>
                  {selectedBook.price && <p><span className="text-muted-foreground">Harga:</span> {selectedBook.price}</p>}
                </div>
                {selectedBook.orderInfo && <p className="mt-3 text-sm font-semibold text-primary">Info pemesanan: {selectedBook.orderInfo}</p>}
                <Button asChild variant="glass" className="mt-5 w-full"><Link to="/contact">Hubungi Penerbit <ArrowRight /></Link></Button>
              </div>
            </div>
          </section>
        </div>
      )}
    </SiteLayout>
  );
}
