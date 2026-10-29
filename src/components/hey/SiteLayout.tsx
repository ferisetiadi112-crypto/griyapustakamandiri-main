import type { ReactNode } from "react";
import { Navbar } from "@/components/hey/Navbar";
import { Footer } from "@/components/hey/Footer";
import { Starfield } from "@/components/hey/Starfield";

/** Public site shell: environment layers → navigation → content → footer. */
export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 grid-lines opacity-40" />
        <Starfield />
        <div className="absolute inset-0 atmosphere" />
      </div>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

/** Standard inner page header used by every secondary public page. */
export function PageHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="shell py-20 md:py-28">
        <div className="max-w-3xl animate-rise">
          <p className="hud-label">{eyebrow}</p>
          <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.05] sm:text-5xl md:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            {description}
          </p>
        </div>
      </div>
    </section>
  );
}
