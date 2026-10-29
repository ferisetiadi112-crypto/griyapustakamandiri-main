import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, FileText, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHero, SiteLayout } from "@/components/hey/SiteLayout";
import { HudChip, HudLabel, Panel, SectionHeading } from "@/components/hey/primitives";

export const Route = createFileRoute("/paket-penerbitan")({
  head: () => ({
    meta: [
      { title: "Paket Penerbitan Buku — Griya Pustaka Mandiri" },
      { name: "description", content: "Bandingkan paket penerbitan buku, fasilitas, persyaratan naskah, dan tahapan proses bersama Griya Pustaka Mandiri." },
      { property: "og:title", content: "Paket Penerbitan — Griya Pustaka Mandiri" },
      { property: "og:description", content: "Pilihan layanan penerbitan buku cetak dan digital untuk penulis." },
    ],
  }),
  component: PaketPenerbitan,
});

const PACKAGES = [
  {
    name: "Basic",
    price: "Rp275.000",
    summary: "Pilihan awal untuk menyiapkan buku digital.",
    features: ["Desain sampul", "E-book PDF", "Sertifikat penulis", "Pendampingan persiapan pengajuan e-ISBN*"],
    note: "Fasilitas dan kelayakan pengajuan ISBN mengikuti ketentuan yang berlaku.",
  },
  {
    name: "Silver",
    price: "Rp455.000",
    summary: "Untuk penulis yang membutuhkan berkas digital dan buku cetak.",
    features: ["ISBN Perpusnas RI*", "Tata letak naskah", "Desain sampul", "E-book PDF", "2 buku cetak A5 atau 1 buku B5 untuk penulis"],
    note: "Jumlah cetak mengacu pada spesifikasi paket rancangan awal.",
  },
  {
    name: "Gold",
    price: "Rp765.000",
    summary: "Pilihan dengan batas naskah hingga 200 halaman.",
    features: ["ISBN Perpusnas RI*", "Tata letak naskah", "Desain sampul", "E-book PDF", "Maksimal 200 halaman", "5 buku cetak A5 atau 4 buku B5 untuk penulis"],
    note: "Spesifikasi akhir, kertas, dan ongkos kirim dikonfirmasi sebelum pengerjaan.",
    featured: true,
  },
  {
    name: "Platinum",
    price: "Rp965.000",
    summary: "Pilihan untuk naskah hingga 250 halaman dengan lebih banyak eksemplar.",
    features: ["ISBN Perpusnas RI*", "Tata letak naskah", "Desain sampul", "E-book PDF", "Maksimal 250 halaman", "10 buku cetak A5 atau 8 buku B5 untuk penulis"],
    note: "Spesifikasi akhir, kertas, dan ongkos kirim dikonfirmasi sebelum pengerjaan.",
  },
];

const PROCESS = [
  ["01", "Konsultasi naskah", "Sampaikan jenis buku, jumlah halaman, format, dan kebutuhan layanan."],
  ["02", "Pemeriksaan & kesepakatan", "Cakupan paket, biaya, jadwal, dan ketentuan revisi dibicarakan sebelum pekerjaan dimulai."],
  ["03", "Desain dan tata letak", "Sampul dan isi disiapkan untuk ditinjau serta disetujui penulis."],
  ["04", "Pengajuan & produksi", "Pengajuan ISBN dilakukan jika memenuhi ketentuan; proses cetak dan penyerahan mengikuti paket yang disepakati."],
];

const REQUIREMENTS = [
  "Naskah final dalam format DOC atau DOCX.",
  "Nama penulis dan afiliasi yang ingin dicantumkan.",
  "Judul, sinopsis, kata kunci, serta biodata singkat penulis.",
  "Pernyataan bahwa naskah merupakan karya yang sah dan memiliki izin untuk diterbitkan.",
  "Gambar, tabel, atau materi pihak lain disertai sumber atau izin yang diperlukan.",
];

const FAQ = [
  ["Apakah ISBN pasti diterbitkan?", "Tidak ada jaminan otomatis. Pengajuan ISBN mengikuti persyaratan dan keputusan lembaga yang berwenang. Naskah dan dokumen akan diperiksa sebelum pengajuan."],
  ["Apakah semua paket termasuk buku cetak?", "Paket Basic dirancang sebagai paket digital. Paket Silver, Gold, dan Platinum mencantumkan jumlah buku cetak sesuai rincian masing-masing."],
  ["Apakah ongkos kirim sudah termasuk?", "Ongkos kirim perlu dikonfirmasi berdasarkan lokasi penerima dan kesepakatan paket sebelum pembayaran."],
  ["Apakah penulis tetap memiliki hak cipta?", "Hak cipta tetap mengikuti ketentuan hukum dan perjanjian tertulis antara penulis dan penerbit. Ketentuan khusus harus disepakati sebelum penerbitan."],
  ["Berapa lama proses penerbitan?", "Durasi bergantung pada kesiapan naskah, revisi, kelengkapan dokumen, proses ISBN, dan produksi cetak. Jadwal disampaikan setelah naskah ditinjau."],
];

function PaketPenerbitan() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Layanan Penerbitan"
        title="Pilih paket yang sesuai dengan perjalanan naskah Anda"
        description="Bandingkan fasilitas penerbitan buku digital dan cetak. Rincian di bawah merupakan rancangan paket awal yang perlu dikonfirmasi kembali sebelum menjadi penawaran final Griya Pustaka Mandiri."
      />

      <section className="section">
        <div className="shell">
          <div className="mb-8 flex flex-col gap-3">
            <HudChip tone="active">Paket Penerbitan</HudChip>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">Harga dan fasilitas berikut disusun sebagai acuan awal. Biaya final, ongkos kirim, spesifikasi cetak, serta ruang lingkup layanan harus dikonfirmasi sebelum pemesanan.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {PACKAGES.map((pkg) => (
              <Panel key={pkg.name} className={`relative flex h-full flex-col p-6 ${pkg.featured ? "border-primary/50 shadow-[0_0_32px_-18px_hsl(var(--primary))]" : ""}`}>
                {pkg.featured && <div className="mb-4"><HudChip tone="active">Pilihan Unggulan</HudChip></div>}
                <HudLabel>Paket {pkg.name}</HudLabel>
                <p className="mt-3 text-3xl font-semibold tracking-tight">{pkg.price}</p>
                <p className="mt-3 min-h-12 text-sm leading-relaxed text-muted-foreground">{pkg.summary}</p>
                <div className="my-5 h-px bg-border" />
                <ul className="flex flex-1 flex-col gap-3">
                  {pkg.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm leading-relaxed">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-5 text-xs leading-relaxed text-muted-foreground">{pkg.note}</p>
                <Button asChild variant={pkg.featured ? "hero" : "glass"} className="mt-6 w-full">
                  <Link to="/contact">Tanyakan Paket <ArrowRight /></Link>
                </Button>
              </Panel>
            ))}
          </div>
          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">*Istilah ISBN dan e-ISBN mengacu pada identitas publikasi sesuai format terbitannya. Pengajuan tetap tunduk pada ketentuan Perpusnas dan tidak dapat dijanjikan pasti disetujui. Paket dan harga pada halaman ini belum merupakan penawaran final.</p>
        </div>
      </section>

      <section className="section pt-0">
        <div className="shell">
          <SectionHeading eyebrow="Sebelum Mengajukan" title="Persiapkan naskah Anda" description="Dokumen yang lengkap membantu proses pemeriksaan dan penerbitan berjalan lebih lancar." />
          <div className="mt-10 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
            <Panel>
              <div className="mb-5 flex items-center gap-3"><FileText className="size-5 text-primary" /><h3 className="text-lg font-semibold">Daftar persiapan naskah</h3></div>
              <ul className="flex flex-col gap-4">
                {REQUIREMENTS.map((item) => <li key={item} className="flex items-start gap-3 text-sm leading-relaxed"><Check className="mt-0.5 size-4 shrink-0 text-primary" /><span>{item}</span></li>)}
              </ul>
            </Panel>
            <Panel className="flex flex-col justify-between gap-6">
              <div>
                <HudLabel>Catatan untuk Penulis</HudLabel>
                <h3 className="mt-3 text-xl font-semibold">Naskah siap, proses lebih jelas.</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Pastikan naskah telah diperiksa, sumber kutipan tercantum, dan seluruh materi visual memiliki izin yang diperlukan. Penyuntingan substantif atau proofreading hanya termasuk jika dinyatakan dalam kesepakatan layanan.</p>
              </div>
              <Button asChild variant="hero" size="lg"><Link to="/contact">Konsultasikan Naskah <MessageCircle /></Link></Button>
            </Panel>
          </div>
        </div>
      </section>

      <section className="section pt-0">
        <div className="shell">
          <SectionHeading eyebrow="Prosedur" title="Dari naskah hingga buku" description="Tahapan kerja dijelaskan di awal supaya penulis mengetahui proses, persetujuan, dan hasil yang akan diterima." />
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {PROCESS.map(([number, title, description]) => (
              <Panel key={number} className="flex gap-5">
                <span className="font-mono text-2xl text-primary">{number}</span>
                <div><h3 className="text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p></div>
              </Panel>
            ))}
          </div>
        </div>
      </section>

      <section className="section pt-0">
        <div className="shell">
          <SectionHeading eyebrow="FAQ" title="Pertanyaan yang sering diajukan" description="Informasi penting sebelum Anda memilih paket penerbitan." />
          <div className="mt-8 flex flex-col gap-3">
            {FAQ.map(([question, answer]) => (
              <details key={question} className="panel group p-5">
                <summary className="cursor-pointer list-none text-base font-medium marker:hidden">{question}<span className="float-right ml-4 text-primary transition-transform group-open:rotate-45">+</span></summary>
                <p className="mt-4 max-w-4xl text-sm leading-relaxed text-muted-foreground">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="section pt-0">
        <div className="shell">
          <Panel className="relative overflow-hidden p-8 md:p-12">
            <div aria-hidden className="absolute inset-0 atmosphere opacity-60" />
            <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl"><HudLabel>Langkah Selanjutnya</HudLabel><h2 className="mt-3 text-2xl font-semibold sm:text-3xl">Masih ragu memilih paket?</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Hubungi kami untuk membahas kebutuhan naskah dan mengonfirmasi biaya serta fasilitas sebelum memulai proses.</p></div>
              <Button asChild variant="hero" size="lg"><Link to="/contact">Hubungi Kami <ArrowRight /></Link></Button>
            </div>
          </Panel>
        </div>
      </section>
    </SiteLayout>
  );
}
