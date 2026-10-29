import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/hey/Logo";
import { StatusDot } from "@/components/hey/primitives";

const GROUPS = [
  {
    title: "Penerbitan",
    links: [
      { to: "/paket-penerbitan", label: "Paket Penerbitan" },
      { to: "/about", label: "Tentang Kami" },
      { to: "/contact", label: "Konsultasi Naskah" },
    ],
  },
  {
    title: "Untuk Penulis",
    links: [
      { to: "/paket-penerbitan", label: "Fasilitas Paket" },
      { to: "/paket-penerbitan", label: "Persyaratan Naskah" },
      { to: "/paket-penerbitan", label: "Alur Penerbitan" },
    ],
  },
  {
    title: "Informasi",
    links: [
      { to: "/contact", label: "Kontak" },
      { to: "/login", label: "Akses Pengguna" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="relative border-t border-border">
      <div className="shell grid gap-12 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)] md:py-16">
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">Mendampingi penulis menyiapkan gagasan menjadi buku yang tertata, jelas, dan siap dibaca.</p>
          <StatusDot label="Melayani kebutuhan penerbitan" tone="idle" />
        </div>
        {GROUPS.map((group) => (
          <div key={group.title} className="flex flex-col gap-3">
            <h3 className="hud-label">{group.title}</h3>
            {group.links.map((link, index) => (
              link.to === "/paket-penerbitan" ? (
                <a key={group.title + index} href={link.to} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{link.label}</a>
              ) : (
                <Link key={link.to + index} to={link.to} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{link.label}</Link>
              )
            ))}
          </div>
        ))}
      </div>
      <div className="shell flex flex-col gap-2 border-t border-border py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Griya Pustaka Mandiri. Hak cipta dilindungi sesuai ketentuan yang berlaku.</p>
        <p className="font-mono tracking-widest uppercase">Penerbitan Buku · Cetak & Digital</p>
      </div>
    </footer>
  );
}
