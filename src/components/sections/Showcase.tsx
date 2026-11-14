import { useEffect, useRef, useState } from "react";
import { animate } from "animejs";
import { environments } from "@/data/content";
import { scrollState } from "@/lib/scroll";
import { cn } from "@/lib/utils";
import { CompareSlider } from "@/components/compare/CompareSlider";
import { Badge } from "@/components/ui/badge";

export function Showcase() {
  const [environment, setEnvironment] = useState<(typeof environments)[number]["id"]>("lifestyle");
  const count = useRef<HTMLSpanElement>(null);
  const selected = environments.find((item) => item.id === environment) ?? environments[1];

  useEffect(() => {
    const node = count.current;
    if (!node || scrollState.reduced) return;
    const animation = animate(node, {
      innerHTML: [0, environments.length],
      round: 1,
      duration: 900,
      ease: "outExpo",
    });
    return () => {
      animation.revert();
    };
  }, []);

  return (
    <section id="showcase" data-scene="showcase" className="relative z-10 bg-background px-5 py-24 md:py-28">
      <div className="mx-auto max-w-6xl">
        {/* Header Block */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <Badge variant="outline" className="mb-3 border-primary/40 text-primary">
              Visual Search Robustness
            </Badge>
            <h2 className="section-title">One product. Unlimited visual possibilities.</h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              <span ref={count} className="font-semibold text-foreground">0</span> photographs of the same black and white mesh runner, tested across the diverse environments a visual-search index encounters in production.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start rounded-md border border-border/70 bg-card/60 px-3.5 py-2 text-xs font-mono text-muted-foreground md:self-auto">
            <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span>Active: <strong className="text-foreground">{selected.label}</strong></span>
          </div>
        </div>

        {/* 2-Column Stage: Selector Cards on Left, Compare Slider on Right */}
        <div className="mt-10 grid gap-8 lg:grid-cols-[380px_1fr] lg:items-start">
          {/* Left Column: Vertical Condition Selector Cards */}
          <div className="flex flex-col gap-2.5">
            <div className="mb-1 text-xs font-mono tracking-wider uppercase text-muted-foreground">
              Conditions in dataset ({environments.length})
            </div>
            {environments.map((item, index) => {
              const active = item.id === environment;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setEnvironment(item.id)}
                  className={cn(
                    "group flex items-center gap-3.5 rounded-lg border p-2.5 text-left transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    active
                      ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(214,227,106,0.2)] ring-1 ring-primary"
                      : "border-border/60 bg-card/60 hover:border-foreground/40 hover:bg-card",
                  )}
                  aria-pressed={active}
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border/70 bg-muted">
                    <img
                      src={item.image}
                      alt={item.label}
                      loading="lazy"
                      decoding="async"
                      className={cn(
                        "h-full w-full object-cover transition-transform duration-300",
                        active ? "scale-105" : "group-hover:scale-105",
                      )}
                    />
                    <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 text-[9px] font-mono text-white/90">
                      0{index + 1}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-heading truncate text-sm font-semibold tracking-tight text-foreground">
                        {item.label}
                      </p>
                      {active ? (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-xs">
                          Active
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {item.id === "studio" ? "Baseline anchor frame" : "Augmented real-world condition"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: CompareSlider Stage */}
          <div className="flex flex-col gap-3">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
              <CompareSlider
                before="/images/studio.jpg"
                after={selected.image}
                beforeAlt="Studio packshot baseline of the running shoe"
                afterAlt={`${selected.label} photograph of the running shoe`}
                className="aspect-square max-h-[600px] w-full"
              />
            </div>
            <div className="flex items-center justify-between px-1 text-xs text-muted-foreground font-mono">
              <span>Drag or click slider to compare Studio vs {selected.label}</span>
              <span>1024 × 1024 px · Lossless</span>
            </div>
          </div>
        </div>

        {/* Bottom Horizontal Visual Strip for Fast Switching */}
        <div className="mt-12 border-t border-border/50 pt-8">
          <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-mono uppercase tracking-wider">Fast Condition Overview</span>
            <span className="font-mono">Click any thumbnail to inspect</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {environments.map((item, index) => {
              const active = item.id === environment;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setEnvironment(item.id)}
                  className={cn(
                    "group relative flex flex-col overflow-hidden rounded-md border text-left transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    active
                      ? "border-primary bg-primary/10 shadow-[0_0_16px_rgba(214,227,106,0.25)] ring-1 ring-primary"
                      : "border-border/60 bg-card/70 hover:border-foreground/40 hover:bg-card",
                  )}
                  aria-pressed={active}
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                    <img
                      src={item.image}
                      alt={item.label}
                      loading="lazy"
                      decoding="async"
                      className={cn(
                        "h-full w-full object-cover transition-transform duration-300",
                        active ? "scale-105" : "group-hover:scale-105",
                      )}
                    />
                    {active ? (
                      <span className="absolute top-2 right-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-sm">
                        Comparing
                      </span>
                    ) : null}
                    <span className="absolute bottom-1.5 left-2 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-mono text-white/90 backdrop-blur-xs">
                      0{index + 1}
                    </span>
                  </div>
                  <div className="p-2.5">
                    <p className="font-heading truncate text-xs font-semibold tracking-tight text-foreground">
                      {item.label}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
