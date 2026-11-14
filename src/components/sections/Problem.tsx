import { useRef } from "react";
import { challenges } from "@/data/content";
import { useReveal } from "@/lib/reveal";
import { Card } from "@/components/ui/card";

export function Problem() {
  const root = useRef<HTMLElement>(null);
  useReveal(root);

  return (
    <section id="problem" ref={root} className="relative z-10 bg-background px-5 py-28">
      <div className="mx-auto max-w-6xl">
        <h2 className="section-title max-w-4xl">Studio-perfect images. Real-world imperfect conditions.</h2>
        <div className="mt-14 grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
          <Card data-reveal className="overflow-hidden rounded-sm bg-card p-0 opacity-0 ring-foreground/10">
            <img
              src={challenges[0].image}
              alt={challenges[0].alt}
              loading="lazy"
              decoding="async"
              className="aspect-[4/5] w-full object-cover md:aspect-auto md:h-full"
            />
            <div className="p-6">
              <h3 className="font-heading text-2xl">{challenges[0].title}</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{challenges[0].copy}</p>
            </div>
          </Card>
          <div className="grid gap-4">
            {challenges.slice(1).map((item) => (
              <Card key={item.title} data-reveal className="overflow-hidden rounded-sm bg-card p-0 opacity-0">
                <img
                  src={item.image}
                  alt={item.alt}
                  loading="lazy"
                  decoding="async"
                  className="h-44 w-full object-cover"
                />
                <div className="p-5">
                  <h3 className="font-heading text-xl">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.copy}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
