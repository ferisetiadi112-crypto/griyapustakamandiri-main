import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, Mail, MessageSquareText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHero, SiteLayout } from "@/components/hey/SiteLayout";
import { HudLabel, Panel } from "@/components/hey/primitives";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Kontak Griya Pustaka Mandiri — Konsultasi Naskah" },
      {
        name: "description",
        content: "Siapkan informasi naskah dan kebutuhan penerbitan untuk konsultasi awal dengan Griya Pustaka Mandiri.",
      },
      { property: "og:title", content: "Kontak Griya Pustaka Mandiri" },
      {
        property: "og:description",
        content: "Mulai percakapan mengenai kebutuhan penerbitan naskah Anda.",
      },
    ],
  }),
  component: Contact,
});

function Contact() {
  const [sent, setSent] = useState(false);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Konsultasi Naskah"
        title="Mari bicarakan rencana buku Anda"
        description="Sampaikan jenis naskah dan layanan yang dibutuhkan. Formulir ini saat ini merupakan rancangan antarmuka dan belum mengirim pesan ke penerbit secara otomatis."
      />
      <section className="section">
        <div className="shell grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          <Panel className="p-6 md:p-8">
            <div className="mb-6">
              <HudLabel>Informasi Naskah</HudLabel>
              <h2 className="mt-2 text-xl font-semibold">Formulir konsultasi</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Isi data berikut sebagai rancangan kebutuhan konsultasi. Jangan mengirim informasi rahasia melalui formulir ini.</p>
            </div>
            <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">Nama penulis</Label>
                  <Input id="name" name="name" placeholder="Nama lengkap" required />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" placeholder="nama@email.com" required />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="subject">Judul atau jenis naskah</Label>
                <Input id="subject" name="subject" placeholder="Contoh: buku referensi, monograf, buku umum" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="message">Kebutuhan penerbitan</Label>
                <Textarea id="message" name="message" rows={6} placeholder="Jelaskan kebutuhan desain, tata letak, ISBN, e-book, atau cetak." required />
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <Button type="submit" variant="hero" size="lg">Pratinjau Pengajuan</Button>
                {sent && <p className="text-sm text-primary" role="status">Pratinjau berhasil dibuat di halaman ini. Pesan belum dikirim ke penerbit.</p>}
              </div>
            </form>
          </Panel>
          <div className="flex flex-col gap-5">
            <Panel interactive className="flex items-start gap-4 p-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-surface/60 text-primary"><BookOpen className="size-4.5" strokeWidth={1.5} /></span>
              <div><HudLabel>Siapkan Naskah</HudLabel><p className="mt-1 text-sm leading-relaxed">Siapkan file naskah, judul, sinopsis, biodata penulis, dan informasi gambar atau tabel yang digunakan.</p></div>
            </Panel>
            <Panel interactive className="flex items-start gap-4 p-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-surface/60 text-primary"><MessageSquareText className="size-4.5" strokeWidth={1.5} /></span>
              <div><HudLabel>Konfirmasi Paket</HudLabel><p className="mt-1 text-sm leading-relaxed">Pastikan biaya, jumlah buku, spesifikasi cetak, revisi, ongkos kirim, dan tahapan kerja telah disepakati.</p></div>
            </Panel>
            <Panel className="flex items-start gap-4 p-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-surface/60 text-primary"><Mail className="size-4.5" strokeWidth={1.5} /></span>
              <div><HudLabel>Kanal Kontak</HudLabel><p className="mt-1 text-sm leading-relaxed">Email dan nomor layanan resmi akan dicantumkan setelah kanal kontak penerbit ditetapkan.</p></div>
            </Panel>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
