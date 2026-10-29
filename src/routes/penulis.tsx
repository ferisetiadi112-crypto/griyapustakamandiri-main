import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, UserRound, BookOpenText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHero, SiteLayout } from "@/components/hey/SiteLayout";
import { Panel } from "@/components/hey/primitives";
import { getPublicAuthorProfiles } from "@/lib/author-profiles";

export const Route = createFileRoute("/penulis")({
  loader: () => getPublicAuthorProfiles(),
  head: () => ({ meta: [{ title: "Penulis — Griya Pustaka Mandiri" }, { name: "description", content: "Kenali para penulis, bidang keahlian, dan gagasan yang mereka bagikan bersama Griya Pustaka Mandiri." }] }),
  component: Authors,
});

function Authors() {
  const result = Route.useLoaderData();
  const authors = result.success ? result.authors : [];
  const duplicated = authors.length > 1 ? [...authors, ...authors] : authors;
  return <SiteLayout>
    <PageHero eyebrow="Komunitas Penulis" title="Penulis dan gagasan mereka" description="Mengenal individu dengan keahlian, pengalaman, dan komitmen untuk memperluas literasi." />
    <section className="section overflow-hidden">
      <div className="shell">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Komunitas intelektual</p><h2 className="mt-2 text-2xl font-semibold md:text-3xl">Kenali para penulis kami</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Para penulis berbagi pengetahuan dari bidang yang mereka tekuni melalui karya dan tulisan yang bermanfaat.</p></div>
          <Button asChild variant="glass"><Link to="/menjadi-penulis">Menjadi Penulis <ArrowRight className="size-4" /></Link></Button>
        </div>
        {authors.length > 0 ? <>
          <div className="author-marquee relative" aria-label="Galeri profil penulis bergerak">
            <div className={authors.length > 1 ? "author-marquee-track author-marquee-moving" : "author-marquee-track"}>
              {duplicated.map((author, index) => <article key={author.id + "-" + index} className="author-marquee-card">
                <div className="author-avatar-wrap"><img src={author.photo_data} alt={`Foto ${author.name}`} className="author-avatar" loading={index > 3 ? "lazy" : "eager"} /></div>
                <h3 className="mt-5 text-lg font-semibold leading-tight">{author.name}</h3>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-primary">Bidang Keahlian</p>
                <p className="mt-1 text-sm font-medium leading-relaxed">{author.expertise}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{author.bio}</p>
              </article>)}
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">Arahkan kursor ke kartu untuk menjeda galeri.</p>
        </> : <Panel className="p-8 text-center md:p-12">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-border bg-primary/10 text-primary"><UserRound className="size-7" /></span>
          <h2 className="mt-4 text-xl font-semibold">Profil penulis segera hadir</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">Profil penulis akan ditampilkan di sini setelah dikelola dan dipublikasikan oleh admin Griya Pustaka Mandiri.</p>
          <Button asChild variant="hero" className="mt-5"><Link to="/menjadi-penulis">Menjadi Penulis <ArrowRight className="size-4" /></Link></Button>
        </Panel>}
      </div>
    </section>
    <section className="section border-t border-border">
      <div className="shell grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Keahlian dan tanggung jawab</p><h2 className="mt-3 text-2xl font-semibold md:text-3xl">Menulis dengan keahlian, berkarya dengan tanggung jawab.</h2></div>
        <div className="space-y-3 text-sm leading-relaxed text-muted-foreground"><p>Pengetahuan akan memberi manfaat lebih luas ketika dibagikan. Melalui tulisan, pengalaman menjadi pembelajaran dan gagasan membuka cara pandang baru.</p><p>Griya Pustaka Mandiri memberi ruang bagi akademisi, praktisi, peneliti, dan penulis yang berkomitmen menyampaikan pengetahuan secara cermat, jujur, dan bermanfaat bagi masyarakat.</p><p className="flex items-center gap-2 text-foreground"><BookOpenText className="size-4 shrink-0 text-primary" /> Menerbitkan gagasan, memperluas pengetahuan.</p></div>
      </div>
    </section>
    <style>{`
      .author-marquee{overflow:hidden;position:relative;width:100%;mask-image:linear-gradient(to right,transparent,black 3%,black 97%,transparent)}
      .author-marquee-track{display:flex;gap:1.25rem;width:max-content;padding:.5rem 0 1rem}
      .author-marquee-moving{animation:author-marquee-scroll 48s linear infinite}
      .author-marquee:hover .author-marquee-moving,.author-marquee:focus-within .author-marquee-moving{animation-play-state:paused}
      .author-marquee-card{box-sizing:border-box;flex:0 0 260px;min-height:390px;padding:1.25rem;border:1px solid hsl(var(--border));border-radius:1.15rem;background:linear-gradient(160deg,hsl(var(--card)),hsl(var(--background)));box-shadow:0 10px 30px #00000012}
      .author-avatar-wrap{display:flex;justify-content:center;padding-top:.25rem}
      .author-avatar{width:112px;height:112px;object-fit:cover;border-radius:9999px;border:2px solid hsl(var(--primary));background:hsl(var(--muted));box-shadow:0 0 0 5px hsl(var(--primary)/.08)}
      @keyframes author-marquee-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
      @media(prefers-reduced-motion:reduce){.author-marquee-moving{animation:none!important;transform:none!important}.author-marquee-track{flex-wrap:wrap;width:100%;justify-content:center}}
    `}</style>
  </SiteLayout>;
}
