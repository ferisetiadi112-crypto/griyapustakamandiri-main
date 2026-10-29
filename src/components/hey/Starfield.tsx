import { cn } from "@/lib/utils";

/** Deterministic pseudo-random so SSR and client markup match exactly. */
function stars(count: number, seed: number, size: number, opacity: number) {
  let s = seed;
  const next = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  return Array.from({ length: count }, () => {
    const x = (next() * 100).toFixed(3);
    const y = (next() * 100).toFixed(3);
    return `radial-gradient(${size}px ${size}px at ${x}% ${y}%, oklch(1 0 0 / ${opacity}) 0%, transparent 100%)`;
  }).join(",");
}

const layerA = stars(90, 7, 1.4, 0.75);
const layerB = stars(60, 991, 2, 0.4);

/**
 * Layered star field. Purely decorative background layer — sits below the
 * atmosphere and interface panels.
 */
export function Starfield({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div
        className="absolute -inset-[20%] animate-drift opacity-70"
        style={{ backgroundImage: layerA, backgroundRepeat: "no-repeat" }}
      />
      <div
        className="absolute -inset-[20%] animate-pulse-soft opacity-50"
        style={{ backgroundImage: layerB, backgroundRepeat: "no-repeat" }}
      />
    </div>
  );
}
