import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { cloneElement, useState, type ReactElement, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, BookOpen, ExternalLink, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/hey/DashboardLayout";
import { HudChip, HudLabel, Panel } from "@/components/hey/primitives";
import { deleteCatalogBook, getAdminCatalogBooks, saveCatalogBook, type CatalogBook } from "@/lib/catalog-books";

export const Route = createFileRoute("/dashboard/katalog")({
  head: () => ({ meta: [{ title: "Kelola Katalog Buku — Griya Pustaka Mandiri" }] }),
  loader: async () => getAdminCatalogBooks(),
  component: CatalogAdmin,
});

type BookForm = Omit<CatalogBook, "id" | "createdAt">;
const emptyForm: BookForm = {
  title: "", author: "", category: "Sosial", synopsis: "", isbn: "",
  status: "upcoming", coverUrl: "", price: "", format: "Cetak", orderInfo: "",
};

function CatalogAdmin() {
  const result = Route.useLoaderData();
  const router = useRouter();
  const save = useServerFn(saveCatalogBook);
  const remove = useServerFn(deleteCatalogBook);
  const [form, setForm] = useState<BookForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | undefined>();
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [coverNotice, setCoverNotice] = useState("");

  async function handleCoverUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setCoverNotice("");
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Format sampul harus JPG, PNG, atau WebP.");
      event.target.value = "";
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("Ukuran file melebihi 3 MB. Silakan kompres gambar atau pilih file yang lebih kecil.");
      event.target.value = "";
      return;
    }
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("File tidak dapat dibaca."));
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("File tidak valid."));
        reader.readAsDataURL(file);
      });
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("File gambar tidak dapat dibuka."));
        img.src = dataUrl;
      });
      if (image.height <= image.width) {
        throw new Error("Pilih gambar sampul dalam posisi portrait (tegak), bukan landscape atau persegi.");
      }
      // Normalize portrait covers to an A4 canvas instead of rejecting slightly different book-cover ratios.
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(1200 * (210 / 297));
      canvas.height = 1200;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Gambar tidak dapat diproses pada browser ini.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      const scale = Math.min(canvas.width / image.width, canvas.height / image.height);
      const drawWidth = Math.round(image.width * scale);
      const drawHeight = Math.round(image.height * scale);
      const offsetX = Math.round((canvas.width - drawWidth) / 2);
      const offsetY = Math.round((canvas.height - drawHeight) / 2);
      context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
      let quality = 0.78;
      let optimized = canvas.toDataURL("image/jpeg", quality);
      while (optimized.length > 220_000 && quality > 0.38) {
        quality -= 0.08;
        optimized = canvas.toDataURL("image/jpeg", quality);
      }
      if (optimized.length > 260_000) throw new Error("Sampul masih terlalu besar setelah dioptimalkan. Pilih gambar yang lebih sederhana atau kompres gambar terlebih dahulu.");
      change("coverUrl", optimized);
      setCoverNotice("Sampul siap digunakan. Gambar telah dioptimalkan otomatis.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Sampul gagal diproses.");
      event.target.value = "";
    }
  }

  function change<K extends keyof BookForm>(key: K, value: BookForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  function resetForm() {
    setForm(emptyForm);
    setEditingId(undefined);
    setError("");
    setCoverNotice("");
  }
  function editBook(book: CatalogBook) {
    const { id, createdAt, ...fields } = book;
    setForm(fields);
    setEditingId(id);
    setNotice("");
    setError("");
    setCoverNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    setError("");
    try {
      const response = await save({ data: { ...form, id: editingId } });
      if (!response.success) { setError(response.error); return; }
      setNotice(editingId ? "Perubahan buku berhasil disimpan." : "Buku berhasil ditambahkan ke katalog.");
      resetForm();
      await router.invalidate();
    } catch {
      setError("Buku belum dapat disimpan. Pastikan DATABASE_URL sudah diatur pada Vercel.");
    } finally {
      setSaving(false);
    }
  }
  async function deleteBook(book: CatalogBook) {
    if (!window.confirm(`Hapus buku "${book.title}" dari katalog?`)) return;
    setError("");
    setNotice("");
    try {
      const response = await remove({ data: { id: book.id } });
      if (!response.success) { setError(response.error); return; }
      setNotice("Buku berhasil dihapus.");
      await router.invalidate();
    } catch {
      setError("Buku gagal dihapus. Coba lagi.");
    }
  }

  return (
    <DashboardLayout title="Katalog Buku" description="Tambahkan dan kelola buku yang akan tampil di halaman katalog publik.">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <HudChip tone="active"><BookOpen className="size-3.5" /> Katalog Terhubung</HudChip>
        <Button asChild variant="glass" size="sm"><Link to="/katalog">Lihat Katalog Publik <ExternalLink className="size-4" /></Link></Button>
      </div>

      <Panel className="p-5 md:p-7">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <HudLabel>{editingId ? "Ubah Data" : "Input Buku Baru"}</HudLabel>
            <h2 className="mt-2 text-xl font-semibold">{editingId ? "Edit informasi buku" : "Tambahkan buku ke katalog"}</h2>
            <p className="mt-2 text-sm text-muted-foreground">Judul dan penulis wajib diisi. ISBN boleh dikosongkan jika masih dalam proses pengajuan.</p>
          </div>
          {editingId ? <Button type="button" variant="glass" size="sm" onClick={resetForm}>Batal edit</Button> : null}
        </div>
        <form onSubmit={submit} className="grid gap-5 md:grid-cols-2">
          <Field label="Judul buku *"><input required value={form.title} onChange={(e) => change("title", e.target.value)} placeholder="Contoh: Urban Social Work" /></Field>
          <Field label="Nama penulis *"><input required value={form.author} onChange={(e) => change("author", e.target.value)} placeholder="Nama penulis" /></Field>
          <Field label="Kategori"><input value={form.category} onChange={(e) => change("category", e.target.value)} placeholder="Sosial, Pendidikan, Agama..." /></Field>
          <Field label="ISBN / QRCBN"><input value={form.isbn} onChange={(e) => change("isbn", e.target.value)} placeholder="Kosongkan bila belum tersedia" /></Field>
          <Field label="Status penerbitan"><select value={form.status} onChange={(e) => change("status", e.target.value as BookForm["status"])}><option value="upcoming">Segera Terbit</option><option value="published">Telah Terbit</option></select></Field>
          <Field label="Format buku"><select value={form.format} onChange={(e) => change("format", e.target.value)}><option>Cetak</option><option>E-book</option><option>Cetak dan E-book</option></select></Field>
          <Field label="Harga (opsional)"><input value={form.price} onChange={(e) => change("price", e.target.value)} placeholder="Contoh: Rp75.000 atau Hubungi penerbit" /></Field>
          <div className="md:col-span-2">
            <label htmlFor="cover-upload" className="mb-2 block text-sm font-medium">Unggah sampul buku (A4 portrait)</label>
            <input
              id="cover-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => void handleCoverUpload(event)}
              className="block w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium"
            />
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Format JPG, PNG, atau WebP. Maksimal 3 MB sebelum diproses. Sampul harus tegak (portrait) dengan rasio A4 210 × 297 mm; ukuran desain yang disarankan 1240 × 1754 px. Gambar akan dioptimalkan otomatis agar katalog tetap cepat dibuka.</p>
            {form.coverUrl && <div className="mt-3 flex items-start gap-4 rounded-xl border border-border p-3">
              <img src={form.coverUrl} alt="Pratinjau sampul buku" className="h-40 w-auto max-w-28 rounded-md border border-border object-contain" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Pratinjau sampul aktif</p>
                <p className="mt-1 text-xs text-muted-foreground">Sampul ini akan ditampilkan pada katalog publik.</p>
                <Button type="button" variant="glass" size="sm" className="mt-3" onClick={() => change("coverUrl", "")}>Hapus sampul</Button>
              </div>
            </div>}
            {coverNotice && <p role="status" className="mt-2 text-sm text-muted-foreground">{coverNotice}</p>}
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">Sinopsis / deskripsi buku</label>
            <textarea rows={5} value={form.synopsis} onChange={(e) => change("synopsis", e.target.value)} placeholder="Tuliskan ringkasan buku untuk calon pembaca..." className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm outline-none focus:border-primary/60" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">Informasi pemesanan (opsional)</label>
            <input value={form.orderInfo} onChange={(e) => change("orderInfo", e.target.value)} placeholder="Contoh: Pesan melalui WhatsApp penerbit" className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none focus:border-primary/60" />
          </div>
          {notice && <p role="status" className="md:col-span-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm">{notice}</p>}
          {error && <p role="alert" className="md:col-span-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>}
          {result.success === false && <p className="md:col-span-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">Data belum dapat dimuat: {result.error}</p>}
          <div className="flex flex-wrap gap-3 md:col-span-2">
            <Button type="submit" variant="hero" disabled={saving}><Save className="size-4" /> {saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Simpan ke Katalog"}</Button>
            {!editingId && <Button type="button" variant="glass" onClick={resetForm}>Kosongkan Form</Button>}
          </div>
        </form>
      </Panel>

      <div className="mt-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div><HudLabel>Data Tersimpan</HudLabel><h2 className="mt-2 text-xl font-semibold">Daftar buku ({result.success ? result.books.length : 0})</h2></div>
          <Button asChild variant="glass" size="sm"><Link to="/katalog">Buka halaman publik <ExternalLink className="size-4" /></Link></Button>
        </div>
        {result.success && result.books.length ? <div className="grid gap-4">
          {result.books.map((book) => <Panel key={book.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            {book.coverUrl ? <img src={book.coverUrl} alt={`Sampul ${book.title}`} className="h-28 w-20 rounded-lg border border-border object-cover" /> : <div className="grid h-28 w-20 place-items-center rounded-lg border border-border bg-secondary/40"><BookOpen className="size-7 text-muted-foreground" /></div>}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-border px-2.5 py-1 text-xs">{book.status === "published" ? "Telah Terbit" : "Segera Terbit"}</span><span className="text-xs text-muted-foreground">{book.category}</span></div>
              <h3 className="mt-2 font-semibold">{book.title}</h3><p className="mt-1 text-sm text-muted-foreground">{book.author}</p>
              <p className="mt-1 text-xs text-muted-foreground">ISBN: {book.isbn || "Belum tersedia"} · {book.format}</p>
            </div>
            <div className="flex shrink-0 gap-2"><Button variant="glass" size="sm" onClick={() => editBook(book)}><Pencil className="size-4" /> Edit</Button><Button variant="glass" size="sm" onClick={() => void deleteBook(book)}><Trash2 className="size-4" /> Hapus</Button></div>
          </Panel>)}
        </div> : <Panel className="p-8 text-center"><BookOpen className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 text-sm text-muted-foreground">Belum ada buku. Isi formulir di atas untuk menambahkan buku pertama.</p></Panel>}
      </div>
      <div className="mt-6"><Button asChild variant="glass"><Link to="/dashboard"><ArrowLeft className="size-4" /> Kembali ke panel admin</Link></Button></div>
    </DashboardLayout>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><label className="mb-2 block text-sm font-medium">{label}</label>{cloneElement(children as ReactElement, { className: "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none focus:border-primary/60" })}</div>;
}
