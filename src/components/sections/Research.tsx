import { useRef } from "react";
import { attributes } from "@/data/content";
import { useReveal } from "@/lib/reveal";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function Research() {
  const photo = useRef<HTMLDivElement>(null);
  useReveal(photo);

  return (
    <section id="research" data-scene="research" className="relative z-10 bg-background px-5 py-28 md:bg-transparent">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_0.8fr]">
        <div className="max-w-xl">
          <Badge variant="outline" className="border-primary/40 text-primary">
            Illustrative demo data
          </Badge>
          <h2 className="section-title mt-5">More than image generation. Product understanding.</h2>
          <p className="mt-5 text-muted-foreground leading-7">
            A vision-language pass is meant to read what the photograph contains, then a consistency check asks whether later frames are still that product. The values here are a fixed example for a running shoe. They are not the output of a live model.
          </p>
          <div ref={photo} data-reveal className="relative mt-8 aspect-[4/3] overflow-hidden border border-border opacity-0 md:hidden">
            <img src="/images/studio.jpg" alt="Studio photograph used as the analysis example" className="h-full w-full object-cover" />
            <div className="scan-line" />
          </div>
        </div>
        <div className="grid content-center gap-3">
          {attributes.map((item) => (
            <Card key={item.label} className="rounded-sm bg-card px-5 py-4">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="mt-1 font-heading text-xl">{item.value}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
