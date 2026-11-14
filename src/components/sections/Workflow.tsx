import { useEffect, useRef, useState } from "react";
import { animate, createDrawable, onScroll } from "animejs";
import { stages } from "@/data/content";
import { scrollState, scrollWorkflowTo, subscribeWorkflowStage } from "@/lib/scroll";
import { mediaSwap } from "@/lib/reveal";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
      className="relative z-10 bg-background md:bg-transparent md:min-h-[320vh]"
    >
      <div className="md:sticky md:top-0 md:flex md:h-svh md:items-center">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-24 md:grid-cols-[280px_1fr] md:py-0">
          <div>
            <h2 className="section-title text-[clamp(2.2rem,4vw,3.6rem)]">From one image to an intelligent dataset.</h2>
            <div className="relative mt-8">
              <svg className="absolute top-2 left-3 hidden h-[calc(100%-12px)] w-4 md:block" viewBox="0 0 16 280" aria-hidden="true">
                <path ref={path} d="M8 0 V280" fill="none" stroke="#d6e36a" strokeWidth="1" />
              </svg>
              <ol className="grid gap-3">
                {stages.map((item, index) => (
                  <li key={item.index}>
                    <Button
                      variant={index === stage ? "default" : "outline"}
                      className="h-auto w-full justify-start px-4 py-3 text-left cursor-pointer"
                      onClick={() => scrollWorkflowTo(index)}
                    >
                      {item.title}
                    </Button>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <figure className="border border-border bg-card">
            <div className="relative aspect-[4/3] overflow-hidden bg-card">
              {stages.map((item, index) => {
                const on = index === stage;
                return (
                  <img
                    key={item.index}
                    src={item.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className={cn(
                      "media-swap absolute inset-0 h-full w-full object-cover",
                      on ? "z-10" : "pointer-events-none z-0",
                    )}
                    style={mediaSwap(on, index < stage)}
                    aria-hidden={!on}
                  />
                );
              })}
            </div>
            <figcaption className="grid p-6">
              {stages.map((item, index) => {
                const on = index === stage;
                return (
                  <div
                    key={item.index}
                    className={cn("media-swap col-start-1 row-start-1", on ? "z-10" : "pointer-events-none z-0")}
                    style={mediaSwap(on, index < stage)}
                    aria-hidden={!on}
                  >
                    <h3 className="font-heading text-3xl">{item.title}</h3>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{item.copy}</p>
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
