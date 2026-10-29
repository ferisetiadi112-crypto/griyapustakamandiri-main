import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, UserPlus } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { PageHero, SiteLayout } from "@/components/hey/SiteLayout";
import { Panel } from "@/components/hey/primitives";
import { registerUser } from "@/lib/publishing-platform";

export const Route = createFileRoute("/daftar")({
  head: () => ({ meta: [{ title: "Daftar Akun — Griya Pustaka Mandiri" }, { name: "description", content: "Buat akun pembeli dan calon penulis Griya Pustaka Mandiri." }] }),
  component: Register,
});
function Register() {
  const navigate = useNavigate();
  const register = useServerFn(registerUser);
  const [name,setName] = useState("");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [confirm,setConfirm] = useState("");
  const [busy,setBusy] = useState(false);
  const [notice,setNotice] = useState("");
  const [error,setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(""); setNotice("");
    if(password !== confirm) { setError("Konfirmasi kata sandi tidak sama."); return; }
    setBusy(true);
    try {
      const result = await register({data:{name,email,password}});
      if(!result.success) { setError(result.error); return; }
      setNotice(result.message);
      if(result.verificationEmailSent) setTimeout(() => void navigate({to:"/masuk"}), 2200);
    } catch { setError("Pendaftaran belum dapat diproses. Silakan coba kembali."); }
    finally { setBusy(false); }
  }
  return <SiteLayout><PageHero eyebrow="Akun Pengguna" title="Buat akun Griya Pustaka Mandiri" description="Gunakan satu akun untuk berbelanja buku dan mengajukan naskah. Pendaftaran serta seleksi naskah tidak dikenai biaya." /><section className="section"><div className="shell"><Panel className="mx-auto max-w-xl p-6 md:p-8"><div className="mb-6 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl border border-border bg-primary/10 text-primary"><UserPlus /></span><div><h2 className="text-xl font-semibold">Daftar akun</h2><p className="text-sm text-muted-foreground">Semua kolom wajib diisi.</p></div></div><form onSubmit={submit} className="space-y-4"><div><label htmlFor="name" className="mb-2 block text-sm font-medium">Nama lengkap</label><input id="name" required minLength={2} maxLength={120} value={name} onChange={e=>setName(e.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm" autoComplete="name" /></div><div><label htmlFor="email" className="mb-2 block text-sm font-medium">Email</label><input id="email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm" autoComplete="email" /></div><div><label htmlFor="password" className="mb-2 block text-sm font-medium">Kata sandi</label><input id="password" type="password" required minLength={10} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm" autoComplete="new-password" /><p className="mt-1 text-xs text-muted-foreground">Minimal 10 karakter.</p></div><div><label htmlFor="confirm" className="mb-2 block text-sm font-medium">Ulangi kata sandi</label><input id="confirm" type="password" required value={confirm} onChange={e=>setConfirm(e.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm" autoComplete="new-password" /></div>{error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}{notice && <p role="status" className="rounded-lg bg-primary/10 p-3 text-sm">{notice}</p>}<Button type="submit" variant="hero" className="w-full" disabled={busy}>{busy?"Membuat akun…":"Buat Akun"} <ArrowRight /></Button></form><p className="mt-5 text-sm text-muted-foreground">Sudah punya akun? <Link to="/masuk" className="text-primary hover:underline">Masuk</Link></p></Panel></div></section></SiteLayout>;
}