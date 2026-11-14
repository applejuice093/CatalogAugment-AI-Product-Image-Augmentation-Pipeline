import { useEffect, useRef, useState } from "react";
import { animate, createDrawable, onScroll } from "animejs";
import { technologies } from "@/data/content";
import { scrollState } from "@/lib/scroll";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type TechnologyProps = {
  active: string;
  onSelect: (id: string) => void;
};

export function Technology({ active, onSelect }: TechnologyProps) {
  const root = useRef<HTMLElement>(null);
  const path = useRef<SVGPathElement>(null);
  const selected = technologies.find((item) => item.id === active) ?? technologies[0];
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    const line = path.current;
    const target = root.current;
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
  }, [ready]);

  return (
    <section id="technology" data-scene="technology" ref={root} className="relative z-10 bg-background px-5 py-28 md:bg-transparent">
      <div className="mx-auto max-w-6xl">
        <h2 className="section-title max-w-3xl">An intelligent pipeline. Built for scale.</h2>
        <div className="relative mt-12 grid gap-8 overflow-x-clip lg:grid-cols-[1.1fr_0.9fr]">
          <svg className="pointer-events-none absolute inset-x-0 top-8 hidden h-16 w-full lg:block" viewBox="0 0 800 40" preserveAspectRatio="none" aria-hidden="true">
            <path ref={path} d="M20 20 H780" fill="none" stroke="#d6e36a" strokeWidth="1" />
          </svg>
          <div className="flex flex-wrap gap-2" role="list">
            {technologies.map((item) => (
              <Button
                key={item.id}
                variant={item.id === active ? "default" : "outline"}
                className="h-11"
                aria-pressed={item.id === active}
                onClick={() => onSelect(item.id)}
              >
                {item.name}
              </Button>
            ))}
          </div>
          <Card className="rounded-sm bg-card p-6">
            <p className="text-xs text-primary">
              {selected.implemented ? "Running in this app" : "Described, not connected"}
            </p>
            <h3 className="font-heading mt-3 text-3xl">{selected.name}</h3>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{selected.responsibility}</p>
            <a className="mt-6 inline-block text-sm text-primary underline-offset-4 hover:underline" href={selected.href} target="_blank" rel="noreferrer">
              Official reference
            </a>
          </Card>
        </div>
      </div>
    </section>
  );
}
