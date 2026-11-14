import { useEffect, useRef, useState } from "react";
import { animate } from "animejs";
import { environments } from "@/data/content";
import { scrollState } from "@/lib/scroll";
import { mediaSwap, useReveal } from "@/lib/reveal";
import { cn } from "@/lib/utils";
import { CompareSlider } from "@/components/compare/CompareSlider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function Showcase() {
  const [environment, setEnvironment] = useState<(typeof environments)[number]["id"]>("lifestyle");
  const count = useRef<HTMLSpanElement>(null);
  const visual = useRef<HTMLDivElement>(null);
  const selected = environments.find((item) => item.id === environment) ?? environments[1];
  const selectedIndex = environments.findIndex((item) => item.id === environment);
  useReveal(visual);

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
    <section id="showcase" data-scene="showcase" className="relative z-10 bg-background px-5 py-28 md:bg-transparent">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <h2 className="section-title">One product. Unlimited visual possibilities.</h2>
          <p className="mt-5 max-w-md text-muted-foreground">
            <span ref={count}>0</span> photographs of the same black and white mesh runner, across the conditions a visual-search index actually sees.
          </p>
        </div>
        <Tabs value={environment} onValueChange={(value) => setEnvironment(value as typeof environment)}>
          <TabsList variant="line" className="h-auto flex-wrap justify-start bg-transparent">
            {environments.map((item) => (
              <TabsTrigger key={item.id} value={item.id} className="h-11 px-3 cursor-pointer">
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <div ref={visual} data-reveal className="relative mt-4 grid opacity-0">
            {environments.map((item, index) => {
              const on = item.id === environment;
              return (
                <div
                  key={item.id}
                  className={cn("media-swap col-start-1 row-start-1", on ? "z-10" : "z-0")}
                  style={mediaSwap(on, index < selectedIndex)}
                  aria-hidden={!on}
                  inert={!on}
                >
                  <CompareSlider
                    before="/images/studio.jpg"
                    after={item.image}
                    beforeAlt="Studio packshot of the running shoe"
                    afterAlt={`${item.label} photograph of the same running shoe`}
                  />
                </div>
              );
            })}
          </div>
        </Tabs>
        <p className="sr-only">Showing {selected.label}</p>
      </div>
    </section>
  );
}
