import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/hey/Logo";
import { StatusDot } from "@/components/hey/primitives";

const GROUPS = [
  { title: "Jelajahi", links: [
    { to: "/katalog", label: "Katalog Buku" },
    { to: "/e-book", label: "E-book" },
    { to: "/penulis", label: "Profil Penulis" },
  ] },
  { title: "Untuk Penulis", links: [
    { to: "/menjadi-penulis", label: "Menjadi Penulis" },
    { to: "/ajukan-naskah", label: "Ajukan Naskah" },
    { to: "/masuk", label: "Akun Penulis" },
  ] },
  { title: "Informasi", links: [
    { to: "/about", label: "Tentang Kami" },
    { to: "/contact", label: "Kontak" },
    { to: "/keranjang", label: "Keranjang Belanja" },
    { to: "/syarat-pembelian", label: "Syarat Pembelian" },
    { to: "/kebijakan-privasi", label: "Kebijakan Privasi" },
    { to: "/kebijakan-naskah", label: "Kebijakan Naskah" },
  ] },
] as const;

export function Footer() {
  return (
    <footer className="relative border-t border-border">
      <div className="shell grid gap-12 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)] md:py-16">
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">Menerbitkan gagasan, memperluas pengetahuan. Temukan buku pilihan dan ajukan naskah untuk seleksi editorial.</p>
          <StatusDot label="Penerbit buku cetak & digital" tone="idle" />
        </div>
        {GROUPS.map((group) => (
          <div key={group.title} className="flex flex-col gap-3">
            <h3 className="hud-label">{group.title}</h3>
            {group.links.map((link) => (
              <Link key={link.to} to={link.to} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{link.label}</Link>
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
