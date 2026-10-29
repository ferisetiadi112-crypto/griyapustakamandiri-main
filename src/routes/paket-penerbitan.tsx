import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, FileText, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHero, SiteLayout } from "@/components/hey/SiteLayout";
import { HudLabel, Panel } from "@/components/hey/primitives";

export const Route = createFileRoute("/paket-penerbitan")({
  head: () => ({ meta: [
    { title: "Menjadi Penulis — Griya Pustaka Mandiri" },
    { name: "description", content: "Ajukan naskah lengkap untuk seleksi editorial Griya Pustaka Mandiri tanpa biaya pendaftaran atau paket penerbitan." },
  ] }),
  component: AuthorGuidelines,
});

function AuthorGuidelines() {
  return <SiteLayout>
    <PageHero eyebrow="Menjadi Penulis" title="Naskah terpilih, diterbitkan melalui kerja sama" description="Griya Pustaka Mandiri tidak menjual paket penerbitan. Calon penulis mengajukan naskah lengkap untuk seleksi editorial. Pengajuan gratis dan tidak menjamin penerbitan." />
    <section className="section"><div className="shell">
      <div className="grid gap-5 md:grid-cols-3">
        <Panel className="p-6"><FileText className="size-6 text-primary"/><h2 className="mt-4 text-lg font-semibold">1. Ajukan naskah lengkap</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Buat akun, isi metadata buku, unggah naskah, dan setujui pernyataan orisinalitas.</p></Panel>
        <Panel className="p-6"><Check className="size-6 text-primary"/><h2 className="mt-4 text-lg font-semibold">2. Seleksi editorial</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Editor menilai kualitas, orisinalitas, relevansi, kebutuhan pembaca, dan potensi pasar.</p></Panel>
        <Panel className="p-6"><Handshake className="size-6 text-primary"/><h2 className="mt-4 text-lg font-semibold">3. Kerja sama tertulis</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Jika dipilih, penerbit dan penulis menyepakati biaya produksi, hak penerbitan, jadwal, dan royalti.</p></Panel>
      </div>
      <Panel className="mt-8 p-6 md:p-8">
        <HudLabel>Prinsip Kerja Sama</HudLabel>
        <h2 className="mt-3 text-2xl font-semibold">Tidak ada paket berbayar untuk penulis</h2>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
          {["Pendaftaran dan seleksi naskah gratis.","Penerbit menanggung biaya produksi untuk naskah yang disetujui, sesuai anggaran dan kontrak.","Hak penerbitan, jangka waktu, dan kewajiban para pihak ditetapkan dalam perjanjian.","Royalti dihitung berdasarkan pendapatan bersih sesuai definisi kontrak.","Pengajuan tidak menjamin naskah akan diterbitkan."].map((item)=><li key={item} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-primary"/>{item}</li>)}
        </ul>
        <div className="mt-7 flex flex-wrap gap-3"><Button asChild variant="hero" size="lg"><Link to="/menjadi-penulis">Baca Panduan Penulis <ArrowRight/></Link></Button><Button asChild variant="glass" size="lg"><Link to="/daftar">Daftar Akun</Link></Button></div>
      </Panel>
    </div></section>
  </SiteLayout>;
}
