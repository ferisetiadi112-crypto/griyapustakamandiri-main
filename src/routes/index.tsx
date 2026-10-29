import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, BookText, FileCheck, PenTool, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteLayout } from "@/components/hey/SiteLayout";
import { FeatureCard, StepCard } from "@/components/hey/FeatureCard";
import { HudChip, HudLabel, Panel, SectionHeading, OrbitRings } from "@/components/hey/primitives";
import horizon from "@/assets/orbital-horizon.jpg";
import vision from "@/assets/vision-5050.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Griya Pustaka Mandiri — Mewujudkan Naskah Menjadi Buku" },
      {
        name: "description",
        content: "Layanan penerbitan buku, desain sampul, tata letak, e-book, dan pendampingan pengajuan ISBN untuk penulis Indonesia.",
      },
      { property: "og:title", content: "Griya Pustaka Mandiri — Penerbitan Buku" },
      {
        property: "og:description",
        content: "Teman perjalanan penulis dari naskah hingga menjadi buku yang siap dibaca.",
      },
    ],
  }),
  component: Home,
});

const SERVICES = [
  {
    icon: BookOpen,
    title: "Penerbitan Buku",
    description: "Pendampingan penerbitan untuk karya ilmiah, buku referensi, buku ajar, dan naskah populer.",
    meta: "Layanan 01",
  },
  {
    icon: PenTool,
    title: "Desain Sampul",
    description: "Sampul yang selaras dengan isi, karakter penulis, dan pembaca yang ingin dijangkau.",
    meta: "Layanan 02",
  },
  {
    icon: BookText,
    title: "Tata Letak Naskah",
    description: "Penataan isi buku agar rapi, konsisten, nyaman dibaca, dan siap masuk tahap pracetak.",
    meta: "Layanan 03",
  },
  {
    icon: FileCheck,
    title: "Pendampingan ISBN",
    description: "Bantuan persiapan berkas dan proses pengajuan ISBN sesuai ketentuan yang berlaku.",
    meta: "Layanan 04",
  },
];

const STEPS = [
  { index: "01", title: "Kirim Naskah", description: "Siapkan naskah dan informasi dasar buku untuk ditinjau." },
  { index: "02", title: "Tinjau & Sepakati", description: "Diskusikan kebutuhan, layanan, biaya, dan jadwal pengerjaan." },
  { index: "03", title: "Desain & Pracetak", description: "Naskah ditata dan sampul disiapkan untuk diperiksa penulis." },
  { index: "04", title: "Terbit & Serahkan", description: "Tahap ISBN, berkas digital, dan cetak dilakukan sesuai paket yang disepakati." },
];

const HIGHLIGHTS = [
  { icon: BookOpen, title: "Karya Akademik", description: "Buku referensi, buku ajar, monograf, dan pengembangan dari karya ilmiah.", meta: "Jenis naskah" },
  { icon: Printer, title: "Buku Cetak & Digital", description: "Pilihan layanan untuk buku cetak, e-book PDF, atau kombinasi keduanya.", meta: "Format keluaran" },
];

function Home() {
  return (
    <SiteLayout>
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <img src={horizon} alt="" width={1920} height={1088} className="absolute inset-x-0 bottom-0 h-[70%] w-full object-cover object-top opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/55 to-background" />
          <OrbitRings className="opacity-40" />
        </div>
        <div className="shell relative py-24 md:py-36">
          <div className="mx-auto flex max-w-3xl animate-rise flex-col items-center text-center">
            <HudChip tone="active">Penerbitan · Buku · Gagasan</HudChip>
            <h1 className="mt-8 text-balance font-display text-5xl font-bold leading-[0.95] sm:text-6xl md:text-7xl lg:text-8xl">
              <span className="block tracking-tight text-gradient text-4xl sm:text-5xl md:text-6xl lg:text-7xl">GRIYA PUSTAKA<br />MANDIRI</span>
              <span className="mt-5 block text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">Wujudkan Naskah Menjadi Buku.</span>
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
              Kami mendampingi penulis menyiapkan karya menjadi buku melalui layanan penerbitan, desain sampul, tata letak, e-book, dan pendampingan pengajuan ISBN.
            </p>
            <div className="mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button asChild variant="hero" size="lg">
                <Link to="/paket-penerbitan">Lihat Paket Penerbitan <ArrowRight /></Link>
              </Button>
              <Button asChild variant="glass" size="lg">
                <Link to="/contact">Konsultasi Naskah</Link>
              </Button>
            </div>
          </div>
          <dl className="mx-auto mt-20 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-4">
            {[
              { label: "Fokus", value: "Penerbitan Buku" },
              { label: "Naskah", value: "Akademik & Umum" },
              { label: "Format", value: "Cetak & Digital" },
              { label: "Pendampingan", value: "Dari Naskah ke Buku" },
            ].map((item) => (
              <div key={item.label} className="bg-background/70 px-5 py-6 backdrop-blur-md">
                <dt className="hud-label">{item.label}</dt>
                <dd className="mt-2 text-sm font-medium">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="section relative">
        <div className="shell">
          <SectionHeading eyebrow="Layanan Kami" title="Setiap gagasan layak dipersiapkan dengan baik" description="Dari penyiapan naskah hingga proses pracetak, layanan disusun agar penulis mengetahui apa yang dikerjakan dan apa yang akan diterima." />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((service) => <FeatureCard key={service.title} {...service} />)}
          </div>
        </div>
      </section>

      <section className="relative">
        <div className="shell">
          <div className="relative overflow-hidden rounded-3xl border border-border">
            <img src={vision} alt="Ilustrasi buku dan gagasan yang melintasi cakrawala" loading="lazy" width={1920} height={912} className="h-[26rem] w-full object-cover md:h-[34rem]" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/65 to-background/10" />
            <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-10">
              <div className="flex flex-wrap gap-3"><HudChip tone="active">Ruang untuk Gagasan</HudChip><HudChip>Proses Transparan</HudChip></div>
              <div className="max-w-xl">
                <h2 className="text-balance text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">Buku yang baik dimulai dari proses yang jelas.</h2>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">Kami mengutamakan komunikasi mengenai kebutuhan naskah, cakupan layanan, biaya, revisi, dan tahapan pengerjaan sebelum proses penerbitan dimulai.</p>
                <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2"><HudLabel>Komunikasi Terbuka</HudLabel><HudLabel>Persetujuan Penulis</HudLabel></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <SectionHeading eyebrow="Alur Penerbitan" title="Empat langkah menuju buku" description="Setiap proyek disesuaikan dengan kondisi naskah dan layanan yang disepakati bersama penulis." />
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => <StepCard key={step.index} {...step} />)}
          </div>
        </div>
      </section>

      <section className="section pt-0">
        <div className="shell">
          <SectionHeading eyebrow="Pilihan Layanan" title="Format dan kebutuhan yang fleksibel" description="Pilih layanan sesuai kebutuhan naskah. Ketersediaan fasilitas, cetak, dan pengajuan ISBN akan dijelaskan dalam rincian paket." />
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {HIGHLIGHTS.map((item) => <FeatureCard key={item.title} {...item} />)}
          </div>
          <p className="mt-6 text-sm text-muted-foreground">Informasi paket dan fasilitas tersedia pada halaman <Link to="/paket-penerbitan" className="text-primary hover:underline">Paket Penerbitan</Link>.</p>
        </div>
      </section>

      <section className="section pt-0">
        <div className="shell">
          <Panel className="relative overflow-hidden p-8 text-center md:p-16">
            <div aria-hidden className="absolute inset-0 atmosphere opacity-70" />
            <div className="relative mx-auto flex max-w-2xl flex-col items-center">
              <HudChip tone="active">Mulai Perjalanan Buku Anda</HudChip>
              <h2 className="mt-6 text-balance text-3xl font-semibold sm:text-4xl">Naskah Anda, langkah berikutnya.</h2>
              <p className="mt-4 text-pretty text-muted-foreground">Pelajari pilihan paket atau hubungi kami untuk membahas kebutuhan penerbitan naskah.</p>
              <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Button asChild variant="hero" size="lg"><Link to="/paket-penerbitan">Bandingkan Paket <ArrowRight /></Link></Button>
                <Button asChild variant="glass" size="lg"><Link to="/contact">Hubungi Penerbit</Link></Button>
              </div>
            </div>
          </Panel>
        </div>
      </section>
    </SiteLayout>
  );
}
