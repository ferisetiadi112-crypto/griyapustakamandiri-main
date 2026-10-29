import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, HeartHandshake, ShieldCheck, Sparkles } from "lucide-react";

import { PageHero, SiteLayout } from "@/components/hey/SiteLayout";
import { FeatureCard } from "@/components/hey/FeatureCard";
import { Panel, SectionHeading, HudLabel } from "@/components/hey/primitives";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Tentang Griya Pustaka Mandiri — Penerbitan Buku" },
      {
        name: "description",
        content: "Kenali Griya Pustaka Mandiri, layanan penerbitan buku yang mendampingi penulis dari persiapan naskah hingga proses terbit.",
      },
      { property: "og:title", content: "Tentang Griya Pustaka Mandiri" },
      {
        property: "og:description",
        content: "Mendampingi penulis menyiapkan gagasan menjadi buku.",
      },
    ],
  }),
  component: About,
});

const VALUES = [
  {
    icon: BookOpen,
    title: "Menghargai Gagasan",
    description: "Setiap naskah diperlakukan sebagai karya yang memiliki tujuan, pembaca, dan karakter tersendiri.",
  },
  {
    icon: HeartHandshake,
    title: "Kerja Sama dengan Penulis",
    description: "Hak penerbitan, biaya produksi, jadwal, dan royalti ditetapkan dalam perjanjian tertulis.",
  },
  {
    icon: ShieldCheck,
    title: "Proses yang Transparan",
    description: "Kami mendorong kejelasan mengenai persyaratan, hak cipta, ISBN, spesifikasi cetak, dan jadwal.",
  },
  {
    icon: Sparkles,
    title: "Kualitas dan Keterbacaan",
    description: "Desain sampul dan tata letak diarahkan untuk membantu buku tampil rapi serta nyaman dibaca.",
  },
];

function About() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Tentang Kami"
        title="Mendampingi gagasan menjadi karya yang dapat dibaca"
        description="Griya Pustaka Mandiri hadir sebagai mitra penerbitan bagi penulis yang ingin menyiapkan naskah menjadi buku, dengan proses yang jelas dan layanan yang disesuaikan dengan kebutuhan karya."
      />
      <section className="section">
        <div className="shell grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-start">
          <div className="flex flex-col gap-6">
            <SectionHeading
              eyebrow="Komitmen"
              title="Penerbitan yang berawal dari seleksi dan kemitraan"
              description="Setiap naskah dinilai berdasarkan orisinalitas, kualitas, relevansi, dan potensi pembaca. Naskah yang dipilih akan dibahas melalui perjanjian kerja sama sebelum produksi dimulai."
            />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Pendaftaran dan seleksi naskah tidak dikenai biaya. Untuk karya yang disetujui, penerbit menanggung biaya produksi sesuai anggaran dan perjanjian; penulis menerima royalti berdasarkan penjualan sesuai kontrak.
            </p>
          </div>
          <Panel className="flex flex-col gap-6">
            <HudLabel>Profil Layanan</HudLabel>
            <dl className="grid gap-5">
              {[
                ["Nama", "Griya Pustaka Mandiri"],
                ["Bidang", "Penerbitan dan persiapan buku"],
                ["Jenis karya", "Karya akademik dan naskah umum"],
                ["Format", "Buku cetak dan digital sesuai layanan"],
                ["Prinsip", "Kejelasan proses dan persetujuan penulis"],
              ].map(([k, v]) => (
                <div key={k} className="border-b border-border pb-4 last:border-0 last:pb-0">
                  <dt className="hud-label">{k}</dt>
                  <dd className="mt-1.5 text-sm">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      </section>
      <section className="section pt-0">
        <div className="shell">
          <SectionHeading eyebrow="Nilai Kami" title="Prinsip dalam setiap proses penerbitan" />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((value) => <FeatureCard key={value.title} {...value} />)}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
