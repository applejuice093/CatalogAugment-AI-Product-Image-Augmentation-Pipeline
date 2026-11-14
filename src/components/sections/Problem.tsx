import { useRef, useEffect } from "react";
import { challenges } from "@/data/content";
import { useReveal } from "@/lib/reveal";
import { Card } from "@/components/ui/card";
import { Sun, Layers, Camera, Sparkles } from "lucide-react";

export function Problem() {
  const root = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  useReveal(root);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {});
    }
  }, []);

  const challengeIcons = [Sun, Layers, Camera];

  return (
    <section id="problem" ref={root} className="relative z-10 bg-background px-6 sm:px-10 lg:px-16 xl:px-24 py-28">
      <div className="mx-auto max-w-[1760px]">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-mono uppercase tracking-widest text-primary">
            Domain Shift Challenge
          </span>
          <h2 className="section-title max-w-5xl">Studio-perfect images. Real-world imperfect conditions.</h2>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-12 lg:items-stretch">
          {/* Main Video Showcase Card */}
          <Card
            data-reveal
            className="overflow-hidden rounded-xl border border-white/10 bg-card/90 p-0 opacity-0 shadow-2xl ring-foreground/10 lg:col-span-7 flex flex-col"
          >
            <div className="relative aspect-[16/10] sm:aspect-[16/9] lg:aspect-auto lg:h-[430px] w-full overflow-hidden bg-black">
              <video
                ref={videoRef}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                poster="/videos/poster.jpg"
                className="h-full w-full object-cover"
              >
                <source src="/videos/hero-background.mp4" type="video/mp4" />
                <source src="/videos/grok-video-b0292768-ed8e-42c3-b055-b829942dff03.mp4" type="video/mp4" />
              </video>

              {/* Status Badges */}
              <div className="absolute top-3.5 left-3.5 flex items-center gap-2 rounded-full border border-white/15 bg-black/75 px-3 py-1 text-xs font-mono text-primary backdrop-blur-md">
                <span className="size-2 rounded-full bg-primary animate-pulse" />
                <span>AI VARIATION PIPELINE</span>
              </div>

              <div className="absolute bottom-3.5 right-3.5 rounded-md border border-white/10 bg-black/75 px-2.5 py-1 text-[11px] font-mono text-zinc-300 backdrop-blur-md">
                1 Photo → 5 Contexts
              </div>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-2 text-xs font-mono text-primary uppercase tracking-wider">
                <Sparkles className="size-3.5" />
                <span>Single Asset → Multi-Environment Synthesis</span>
              </div>
              <h3 className="mt-2 font-heading text-xl md:text-2xl font-semibold text-foreground">
                Synthesizing real-world catalog variance on demand.
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Catalog photos are shot in sterile studios, but buyers search with imperfect smartphone snapshots. Our pipeline generates the exact lighting, background, and camera variations needed to achieve true retrieval invariance.
              </p>
            </div>
          </Card>

          {/* Right column: 3 Challenge Cards without shoe images */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-4">
            {challenges.map((item, index) => {
              const Icon = challengeIcons[index] || Sparkles;
              return (
                <Card
                  key={item.title}
                  data-reveal
                  className="rounded-xl border border-border/70 bg-card/90 p-5 opacity-0 backdrop-blur-md transition-all duration-200 hover:border-primary/50 hover:bg-card flex-1 flex flex-col justify-center"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-xs font-mono font-medium text-primary uppercase tracking-wider">
                      <Icon className="size-4 text-primary" />
                      0{index + 1} // {item.title}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                      Domain Shift
                    </span>
                  </div>
                  <h4 className="mt-2.5 font-heading text-lg font-semibold text-foreground">
                    {item.title}
                  </h4>
                  <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                    {item.copy}
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
