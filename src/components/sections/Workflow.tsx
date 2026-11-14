import { useEffect, useRef, useState } from "react";
import { animate, createDrawable, onScroll } from "animejs";
import { stages } from "@/data/content";
import { scrollState, scrollWorkflowTo, subscribeWorkflowStage } from "@/lib/scroll";
import { mediaSwap } from "@/lib/reveal";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const stageTelemetry = [
  {
    phase: "PHASE 01",
    tag: "STUDIO ISOLATION",
    resolution: "4096 × 4096 RAW",
    engine: "ALPHA MATTE / INGESTION",
    status: "READY",
  },
  {
    phase: "PHASE 02",
    tag: "DIFFUSION DAG",
    resolution: "2048 × 2048 SYNTHESIS",
    engine: "SDXL + CONTROLNET CANNY",
    status: "GENERATING",
  },
  {
    phase: "PHASE 03",
    tag: "VLM TAXONOMY",
    resolution: "12 ATTRIBUTES EXTRACTED",
    engine: "GEMINI 2.5 / LLAVA HYBRID",
    status: "CONFIDENCE 99.4%",
  },
  {
    phase: "PHASE 04",
    tag: "CONSISTENCY AUDIT",
    resolution: "IDENTITY MATCH 98.6%",
    engine: "MSE 0.012 // SSIM 0.941",
    status: "QC PASS",
  },
];

export function Workflow() {
  const section = useRef<HTMLElement>(null);
  const path = useRef<SVGPathElement>(null);
  const [stage, setStage] = useState(0);

  useEffect(() => subscribeWorkflowStage(setStage), []);

  useEffect(() => {
    const line = path.current;
    const target = section.current;
    if (!line || !target || scrollState.reduced) return;
    const drawable = createDrawable(line);
    const animation = animate(drawable, {
      draw: ["0 0", "0 1"],
      ease: "linear",
      autoplay: onScroll({ target, sync: true }),
    });
    return () => {
      animation.revert();
    };
  }, []);

  return (
    <section
      id="workflow"
      data-scene="workflow"
      ref={section}
      className="relative z-10 bg-background md:min-h-[320vh]"
    >
      <div className="md:sticky md:top-16 md:flex md:h-[calc(100svh-4rem)] md:items-center">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-6 md:grid-cols-[280px_1fr]">
          <div>
            <h2 className="section-title text-[clamp(1.75rem,2.4vw,2.4rem)]">From one image to an intelligent dataset.</h2>
            <div className="relative mt-8 flex items-stretch gap-4">
              <div className="relative flex w-4 shrink-0 justify-center py-2" aria-hidden="true">
                <svg
                  className="h-full w-4 overflow-visible"
                  viewBox="0 0 16 280"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <filter id="workflow-glow" x="-100%" y="-20%" width="300%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="glow" />
                      <feMerge>
                        <feMergeNode in="glow" />
                        <feMergeNode in="glow" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  {/* Background guide rail */}
                  <path
                    d="M8 0 V280"
                    fill="none"
                    stroke="rgba(232, 230, 223, 0.14)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  {/* Active animated glowing laser path */}
                  <path
                    ref={path}
                    d="M8 0 V280"
                    fill="none"
                    stroke="#d6e36a"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    filter="url(#workflow-glow)"
                    style={{
                      filter:
                        "drop-shadow(0 0 4px #d6e36a) drop-shadow(0 0 8px #d6e36a) drop-shadow(0 0 16px rgba(214, 227, 106, 0.8))",
                    }}
                  />
                </svg>
              </div>
              <ol className="grid flex-1 gap-3">
                {stages.map((item, index) => (
                  <li key={item.index}>
                    <Button
                      variant={index === stage ? "default" : "outline"}
                      className={cn(
                        "h-auto w-full justify-start px-4 py-3 text-left cursor-pointer transition-all duration-200 rounded-xl",
                        index === stage && "section-button--active",
                      )}
                      onClick={() => {
                        setStage(index);
                        scrollWorkflowTo(index);
                      }}
                    >
                      {item.title}
                    </Button>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <figure className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl transition-all duration-300">
            {/* Header Telemetry Bar */}
            <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-5 py-3">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                <span className="font-mono text-xs font-semibold tracking-wider text-foreground">
                  {stageTelemetry[stage]?.phase} // {stages[stage]?.title.toUpperCase()}
                </span>
                <span className="hidden sm:inline-block rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-medium text-primary">
                  {stageTelemetry[stage]?.tag}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden md:inline-block font-mono text-[11px] text-muted-foreground">
                  {stageTelemetry[stage]?.engine}
                </span>
                <span className="rounded-md border border-border bg-background/80 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-primary shadow-xs">
                  {stageTelemetry[stage]?.status}
                </span>
              </div>
            </div>

            {/* Media Canvas (FULL WIDTH, ZERO EMPTY VOID) */}
            <div className="relative w-full aspect-[16/10] max-h-[48vh] overflow-hidden bg-black/40">
              {stages.map((item, index) => {
                const on = index === stage;
                return (
                  <div
                    key={item.index}
                    className={cn(
                      "media-swap absolute inset-0 h-full w-full",
                      on ? "z-10" : "pointer-events-none z-0",
                    )}
                    style={mediaSwap(on, index < stage)}
                    aria-hidden={!on}
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                    {/* Viewfinder Framing Marks */}
                    <div className="pointer-events-none absolute inset-0 z-20 p-4">
                      <div className="absolute top-4 left-4 h-3 w-3 border-t-2 border-l-2 border-primary/60" />
                      <div className="absolute top-4 right-4 h-3 w-3 border-t-2 border-r-2 border-primary/60" />
                      <div className="absolute bottom-4 left-4 h-3 w-3 border-b-2 border-l-2 border-primary/60" />
                      <div className="absolute bottom-4 right-4 h-3 w-3 border-b-2 border-r-2 border-primary/60" />

                      {/* Lower Overlay Badge */}
                      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 rounded-md border border-white/10 bg-black/60 px-2.5 py-1 text-[11px] font-mono font-medium text-white/90 backdrop-blur-md">
                        <span className="text-primary font-semibold">RESOLUTION</span>
                        <span>{stageTelemetry[index]?.resolution}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Figcaption with details and studio CTA */}
            <figcaption className="grid border-t border-border/60 bg-card/60 p-6 backdrop-blur-xs">
              {stages.map((item, index) => {
                const on = index === stage;
                return (
                  <div
                    key={item.index}
                    className={cn(
                      "media-swap col-start-1 row-start-1 flex flex-col justify-between gap-4 md:flex-row md:items-center",
                      on ? "z-10" : "pointer-events-none z-0",
                    )}
                    style={mediaSwap(on, index < stage)}
                    aria-hidden={!on}
                  >
                    <div className="space-y-1.5 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold tracking-wider text-primary">
                          {stageTelemetry[index]?.phase}
                        </span>
                        <span className="h-1 w-1 rounded-full bg-primary/60" />
                        <span className="font-mono text-xs uppercase text-muted-foreground">
                          Catalog Pipeline
                        </span>
                      </div>
                      <h3 className="font-heading text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                        {item.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {item.copy}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2 pt-2 md:pt-0">
                      <a
                        href="#workspace"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3.5 py-2 font-mono text-xs font-medium text-primary transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:shadow-[0_0_15px_rgba(214,227,106,0.25)]"
                      >
                        <span>Open in Studio</span>
                        <span aria-hidden="true">→</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
