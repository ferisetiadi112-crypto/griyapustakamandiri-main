import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, UserRound, ArrowRight, ShieldCheck } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/hey/Logo";
import { HudChip, HudLabel } from "@/components/hey/primitives";
import { loginAdmin } from "@/lib/admin-auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Masuk Admin — Griya Pustaka Mandiri" },
      { name: "description", content: "Masuk ke panel admin Griya Pustaka Mandiri untuk mengelola katalog buku dan koleksi e-book." },
      { property: "og:title", content: "Masuk Admin — Griya Pustaka Mandiri" },
      { property: "og:description", content: "Panel pengelolaan katalog buku dan e-book." },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const loginAdminFn = useServerFn(loginAdmin);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const result = await loginAdminFn({ data: { username, password } });
      if (result.success) {
        await navigate({ to: "/dashboard" });
      } else if (result.error === "config_missing") {
        setError("Login admin belum dikonfigurasi. Atur ADMIN_USERNAME, ADMIN_PASSWORD, dan SESSION_SECRET pada Environment Variables Vercel.");
      } else {
        setError("Username atau password tidak sesuai.");
      }
    } catch {
      setError("Login belum dapat diproses. Silakan coba kembali.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 grid-lines opacity-30" />
        <div className="absolute inset-0 atmosphere" />
        <div className="absolute -left-24 top-1/4 size-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-24 bottom-0 size-80 rounded-full bg-sky-400/10 blur-3xl" />
      </div>

      <section className="relative w-full max-w-md animate-rise">
        <Link to="/" className="mb-8 flex justify-center"><Logo /></Link>
        <div className="rounded-3xl border border-border bg-background/80 p-7 shadow-2xl backdrop-blur-xl sm:p-9">
          <div className="mb-7 flex flex-col items-center text-center">
            <span className="mb-5 grid size-14 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <LockKeyhole className="size-6" />
            </span>
            <HudChip tone="active">Akses Terbatas</HudChip>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Masuk Admin</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Masuk untuk mengelola katalog buku dan koleksi e-book Griya Pustaka Mandiri.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="admin-username" className="mb-2 block text-sm font-medium">Username</label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input id="admin-username" name="username" type="text" autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Masukkan username" className="h-12 w-full rounded-xl border border-border bg-background/70 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/10" />
              </div>
            </div>

            <div>
              <label htmlFor="admin-password" className="mb-2 block text-sm font-medium">Password</label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input id="admin-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Masukkan password" className="h-12 w-full rounded-xl border border-border bg-background/70 pl-10 pr-12 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/10" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm leading-relaxed text-destructive">{error}</p>}

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Memeriksa..." : "Masuk ke Panel Admin"}
              {!isSubmitting && <ArrowRight className="size-4" />}
            </Button>
          </form>

          <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-secondary/30 p-3.5">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-xs leading-relaxed text-muted-foreground">Halaman ini khusus administrator. Tidak tersedia pendaftaran akun publik.</p>
          </div>
          <div className="mt-7 text-center">
            <HudLabel><Link to="/" className="transition-colors hover:text-foreground">Kembali ke situs utama</Link></HudLabel>
          </div>
        </div>
        <p className="mt-5 text-center text-xs text-muted-foreground">© Griya Pustaka Mandiri</p>
      </section>
    </main>
  );
}
