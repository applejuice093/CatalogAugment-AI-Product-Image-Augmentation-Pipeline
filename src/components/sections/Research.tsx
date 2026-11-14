import { attributes } from "@/data/content";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Scan, Sparkles, CheckCircle2 } from "lucide-react";

export function Research() {
  return (
    <section
      id="research"
      className="relative z-10 bg-background px-5 py-24 border-t border-border/40"
    >
      <div className="mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="max-w-2xl mb-12">
          <Badge variant="outline" className="border-primary/40 text-primary mb-4">
            <Sparkles className="size-3 mr-1.5 inline" />
            Illustrative demo data
          </Badge>
          <h2 className="section-title text-[clamp(2rem,3.2vw,3.2rem)] font-bold tracking-tight">
            More than image generation. Product understanding.
          </h2>
          <p className="mt-4 text-muted-foreground text-base md:text-lg leading-relaxed">
            A vision-language pass reads what the photograph contains, extracting structural categories and material definitions. A subsequent consistency check validates identity across all synthetic iterations.
          </p>
        </div>

        {/* 2-Column Side-by-Side Analysis Grid */}
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
          {/* Column 1: Scanner Chamber & Image (7 cols) */}
          <div className="lg:col-span-7">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/15 bg-card/60 backdrop-blur-sm shadow-2xl">
              {/* Product Image under analysis */}
              <img
                src="/images/studio.jpg"
                alt="Studio photograph under vision-language analysis"
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />

              {/* Laser scan line sweeping vertically */}
              <div className="scan-line" />

              {/* Bounding box corners in neon green */}
              <div className="absolute inset-8 pointer-events-none border border-primary/50 rounded-lg">
                <span className="absolute -top-1.5 -left-1.5 size-3 rounded-full bg-primary shadow-[0_0_8px_#d6e36a]" />
                <span className="absolute -top-1.5 -right-1.5 size-3 rounded-full bg-primary shadow-[0_0_8px_#d6e36a]" />
                <span className="absolute -bottom-1.5 -left-1.5 size-3 rounded-full bg-primary shadow-[0_0_8px_#d6e36a]" />
                <span className="absolute -bottom-1.5 -right-1.5 size-3 rounded-full bg-primary shadow-[0_0_8px_#d6e36a]" />
              </div>

              {/* Top Detection Telemetry Badge */}
              <div className="absolute top-4 left-4 flex items-center gap-2 rounded-lg border border-white/15 bg-black/75 px-3 py-1.5 text-xs font-mono text-zinc-200 backdrop-blur-md shadow-lg">
                <Scan className="size-3.5 text-primary animate-pulse" />
                <span>OBJECT RECOGNITION // 99.4% CONF</span>
              </div>

              {/* Bottom Detection Coordinates */}
              <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-lg border border-white/15 bg-black/75 px-3 py-1.5 text-xs font-mono text-zinc-300 backdrop-blur-md shadow-lg">
                <span>BBOX [120, 84, 896, 620]</span>
              </div>
            </div>
          </div>

          {/* Column 2: Extracted Attributes (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            {attributes.map((item) => {
              const isVerified = item.label.toLowerCase().includes("consistency");
              return (
                <Card
                  key={item.label}
                  className="rounded-xl border border-border/70 bg-card/90 backdrop-blur-md p-4 transition-all duration-200 hover:border-primary/50 hover:bg-card"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground/90">
                      {item.label}
                    </p>
                    {isVerified && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-primary">
                        <CheckCircle2 className="size-3" />
                        AUDIT PASS
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-heading text-lg md:text-xl font-semibold text-foreground">
                    {item.value}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
