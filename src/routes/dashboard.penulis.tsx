import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUp, ImagePlus, Pencil, Plus, Save, Trash2, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/hey/DashboardLayout";
import { Panel } from "@/components/hey/primitives";
import { deleteAuthorProfile, getAdminAuthorProfiles, saveAuthorProfile, type AuthorProfile } from "@/lib/author-profiles";

export const Route = createFileRoute("/dashboard/penulis")({
  loader: () => getAdminAuthorProfiles(),
  head: () => ({ meta: [{ title: "Kelola Penulis — Dashboard GPM" }] }),
  component: AuthorsAdmin,
});

type FormState = { name: string; photoData: string; expertise: string; bio: string; active: boolean; sortOrder: number };
const emptyForm: FormState = { name: "", photoData: "", expertise: "", bio: "", active: true, sortOrder: 1 };

function AuthorsAdmin() {
  const result = Route.useLoaderData();
  const router = useRouter();
  const save = useServerFn(saveAuthorProfile);
  const remove = useServerFn(deleteAuthorProfile);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | undefined>();
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [photoNotice, setPhotoNotice] = useState("");
  const authors = result.success ? result.authors : [];

  function change<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(current => ({ ...current, [key]: value }));
  }
  function reset() {
    setForm({ ...emptyForm, sortOrder: authors.length + 1 });
    setEditingId(undefined);
    setError("");
    setPhotoNotice("");
  }
  function edit(author: AuthorProfile) {
    setEditingId(author.id);
    setForm({ name: author.name, photoData: author.photo_data, expertise: author.expertise, bio: author.bio, active: author.active, sortOrder: author.sort_order });
    setNotice("");
    setError("");
    setPhotoNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function uploadPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(""); setPhotoNotice("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Foto harus berformat JPG, PNG, atau WebP."); event.target.value = ""; return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran foto sumber maksimal 5 MB."); event.target.value = ""; return;
    }
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Foto tidak dapat dibaca."));
        reader.onerror = () => reject(new Error("Foto tidak dapat dibaca."));
        reader.readAsDataURL(file);
      });
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error("File gambar tidak valid.")); img.src = dataUrl;
      });
      const canvas = document.createElement("canvas");
      const side = 480; canvas.width = side; canvas.height = side;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Foto tidak dapat diproses pada browser ini.");
      const scale = Math.max(side / image.width, side / image.height);
      const width = image.width * scale, height = image.height * scale;
      context.drawImage(image, (side - width) / 2, (side - height) / 2, width, height);
      let quality = 0.78;
      let optimized = canvas.toDataURL("image/jpeg", quality);
      while (optimized.length > 500_000 && quality > 0.35) {
        quality -= 0.08; optimized = canvas.toDataURL("image/jpeg", quality);
      }
      if (optimized.length > 550_000) throw new Error("Foto terlalu besar setelah dioptimalkan. Pilih foto lain.");
      change("photoData", optimized);
      setPhotoNotice("Foto berhasil diproses dan siap disimpan.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Foto gagal diproses.");
      event.target.value = "";
    }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setNotice(""); setError("");
    try {
      const response = await save({ data: { ...form, id: editingId } });
      if (!response.success) { setError(response.error); return; }
      setNotice(editingId ? "Profil penulis berhasil diperbarui." : "Penulis berhasil ditambahkan.");
      reset();
      await router.invalidate();
    } catch {
      setError("Data belum dapat disimpan. Periksa koneksi database dan hak akses admin.");
    } finally { setSaving(false); }
  }
  async function deleteAuthor(author: AuthorProfile) {
    if (!window.confirm(`Hapus profil penulis ${author.name}?`)) return;
    setError(""); setNotice("");
    try {
      const response = await remove({ data: { id: author.id } });
      if (!response.success) { setError(response.error); return; }
      setNotice("Profil penulis berhasil dihapus.");
      if (editingId === author.id) reset();
      await router.invalidate();
    } catch { setError("Profil penulis gagal dihapus."); }
  }
  async function toggleActive(author: AuthorProfile) {
    setError(""); setNotice("");
    try {
      const response = await save({ data: { id: author.id, name: author.name, photoData: author.photo_data, expertise: author.expertise, bio: author.bio, active: !author.active, sortOrder: author.sort_order } });
      if (!response.success) { setError(response.error); return; }
      setNotice(author.active ? "Profil disembunyikan dari halaman publik." : "Profil ditampilkan di halaman publik.");
      await router.invalidate();
    } catch { setError("Status penulis gagal diubah."); }
  }

  return <DashboardLayout title="Kelola Penulis" description="Tambah dan kelola profil penulis yang tampil sebagai kartu bergerak pada halaman Penulis publik.">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{authors.length} profil penulis tersimpan</p><Button asChild variant="glass" size="sm"><Link to="/penulis">Lihat Halaman Publik <ArrowUp className="size-4" /></Link></Button></div>
    {notice && <p role="status" className="rounded-lg border border-primary/20 bg-primary/10 p-3 text-sm">{notice}</p>}
    {error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    <Panel className="p-5 md:p-7">
      <div className="mb-6 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><UsersRound className="size-5" /></span><div><h2 className="text-lg font-semibold">{editingId ? "Edit Profil Penulis" : "Tambah Penulis"}</h2><p className="text-sm text-muted-foreground">Isi data singkat untuk kartu profil.</p></div></div>
      <form onSubmit={event => void submit(event)} className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2"><label htmlFor="author-name" className="text-sm font-medium">Nama lengkap *</label><input id="author-name" required minLength={2} maxLength={120} value={form.name} onChange={e => change("name", e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" placeholder="Nama penulis" /></div>
        <div className="space-y-2 md:col-span-2"><label htmlFor="author-photo" className="text-sm font-medium">Foto profil *</label><div className="flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-border p-4">{form.photoData ? <img src={form.photoData} alt="Pratinjau foto penulis" className="size-24 rounded-full border-2 border-primary object-cover" /> : <span className="grid size-24 place-items-center rounded-full bg-muted text-muted-foreground"><ImagePlus className="size-8" /></span>}<div className="min-w-0 flex-1"><input id="author-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => void uploadPhoto(event)} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-sm file:font-medium" /><p className="mt-2 text-xs text-muted-foreground">JPG, PNG, WebP. Maksimal 5 MB sebelum diproses; foto akan dipotong persegi untuk bingkai lingkaran.</p>{photoNotice && <p className="mt-1 text-xs text-primary">{photoNotice}</p>}</div></div></div>
        <div className="space-y-2 md:col-span-2"><label htmlFor="author-expertise" className="text-sm font-medium">Bidang keahlian *</label><input id="author-expertise" required minLength={3} maxLength={180} value={form.expertise} onChange={e => change("expertise", e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" placeholder="Contoh: Pekerjaan Sosial Klinis dan Pemberdayaan Masyarakat" /></div>
        <div className="space-y-2 md:col-span-2"><label htmlFor="author-bio" className="text-sm font-medium">Latar belakang singkat *</label><textarea id="author-bio" required minLength={10} maxLength={360} rows={3} value={form.bio} onChange={e => change("bio", e.target.value)} className="w-full resize-y rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" placeholder="Maksimal 2–3 kalimat singkat, padat, dan jelas." /><p className="text-right text-xs text-muted-foreground">{form.bio.length}/360 karakter</p></div>
        <div className="space-y-2"><label htmlFor="author-order" className="text-sm font-medium">Urutan kartu</label><input id="author-order" type="number" min={0} max={9999} value={form.sortOrder} onChange={e => change("sortOrder", Number(e.target.value))} className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" /></div>
        <div className="flex items-center gap-3 self-end pb-2"><input id="author-active" type="checkbox" checked={form.active} onChange={e => change("active", e.target.checked)} className="size-4 accent-primary" /><label htmlFor="author-active" className="text-sm font-medium">Tampilkan di halaman publik</label></div>
        <div className="flex flex-wrap gap-2 md:col-span-2"><Button type="submit" variant="hero" disabled={saving || !form.photoData}><Save className="size-4" />{saving ? "Menyimpan…" : editingId ? "Simpan Perubahan" : "Tambah Penulis"}</Button>{editingId && <Button type="button" variant="glass" onClick={reset}>Batal Edit</Button>}</div>
      </form>
    </Panel>
    <section className="space-y-3"><div><h2 className="text-lg font-semibold">Daftar Penulis</h2><p className="text-sm text-muted-foreground">Ubah status publikasi atau perbarui informasi setiap penulis.</p></div>
      {authors.length ? authors.map(author => <Panel key={author.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center"><img src={author.photo_data} alt="" className="size-20 shrink-0 rounded-full border border-border object-cover" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{author.name}</h3><span className={author.active ? "rounded-full bg-primary/10 px-2 py-1 text-xs text-primary" : "rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"}>{author.active ? "Tampil publik" : "Disembunyikan"}</span></div><p className="mt-1 text-sm text-muted-foreground">{author.expertise}</p><p className="mt-2 text-sm">{author.bio}</p><p className="mt-2 text-xs text-muted-foreground">Urutan: {author.sort_order}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="glass" onClick={() => edit(author)}><Pencil className="size-4" /> Edit</Button><Button size="sm" variant="glass" onClick={() => void toggleActive(author)}>{author.active ? "Sembunyikan" : "Tampilkan"}</Button><Button size="sm" variant="destructive" onClick={() => void deleteAuthor(author)}><Trash2 className="size-4" /> Hapus</Button></div></Panel>) : <Panel className="p-8 text-center text-sm text-muted-foreground">Belum ada profil penulis. Tambahkan melalui formulir di atas.</Panel>}
    </section>
  </DashboardLayout>;
}
