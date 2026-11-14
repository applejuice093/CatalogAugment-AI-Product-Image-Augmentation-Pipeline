import { useEffect, useRef } from "react";
import { animate, splitText, stagger } from "animejs";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { scrollState } from "@/lib/scroll";
import { LightningGlowText } from "@/components/effects/LightningGlowText";

const cards = [
  { src: "/images/lifestyle.jpg", alt: "Running shoe in a lifestyle interior", className: "left-[8%] top-[18%] w-28 md:w-36" },
  { src: "/images/outdoor.jpg", alt: "Running shoe outdoors", className: "right-[6%] top-[28%] w-24 md:w-32" },
  { src: "/images/commercial.jpg", alt: "Running shoe in a commercial setup", className: "bottom-[12%] left-[18%] w-24 md:w-32" },
];

export function Hero() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const scope = root.current;
    if (!scope) return;
    const title = scope.querySelector<HTMLElement>("[data-hero-title]");
    const rest = scope.querySelectorAll<HTMLElement>("[data-hero-reveal]");
    if (!title) return;
    if (scrollState.reduced) {
      title.style.opacity = "1";
      rest.forEach((node) => {
        node.style.opacity = "1";
      });
      return;
    }
    const split = splitText(title, { words: true });
    const entrance = animate(split.words, {
      opacity: [0, 1],
      y: [22, 0],
      delay: stagger(55),
      duration: 800,
      ease: "outExpo",
    });
    const follow = animate(rest, {
      opacity: [0, 1],
      y: [16, 0],
      delay: stagger(90, { start: 280 }),
      duration: 700,
      ease: "outExpo",
    });
    const onPointer = (event: PointerEvent) => {
      if (window.matchMedia("(hover: none)").matches) return;
      const bounds = scope.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      scope.style.setProperty("--px", `${x * 16}px`);
      scope.style.setProperty("--py", `${y * 12}px`);
    };
    scope.addEventListener("pointermove", onPointer);
    return () => {
      scope.removeEventListener("pointermove", onPointer);
      entrance.revert();
      follow.revert();
      split.revert();
    };
  }, []);

  return (
    <section
      id="platform"
      data-scene="hero"
      ref={root}
      className="relative z-10 flex min-h-[100dvh] items-center overflow-hidden px-5 pt-24 pb-16"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#101210_0%,rgb(16_18_16/0.92)_36%,rgb(16_18_16/0.28)_62%,transparent_78%)]"
      />
      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div>
          <LightningGlowText
            as="h1"
            data-hero-title=""
            className="text-[clamp(2.15rem,3.3vw,3.05rem)] leading-[1.08] font-semibold tracking-[-0.04em]"
            speed={1.0}
            size={1.15}
            particleAmount={1.3}
            hue={-55}
            brightness={1.35}
            opacity={0.92}
          >
            <span className="block">Make every product</span>
            <span className="block">image search-ready.</span>
          </LightningGlowText>

          <p data-hero-reveal className="mt-6 max-w-md text-base leading-7 text-muted-foreground opacity-0">
            Turn one product photograph into a varied set that still reads as the same product.
          </p>
          <div data-hero-reveal className="mt-8 flex flex-wrap gap-3 opacity-0">
            <a
              href="#workspace"
              className={cn(
                buttonVariants(),
                "h-11 px-5 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(214,227,106,0.3)]",
              )}
            >
              Launch Studio Workspace
            </a>
            <a href="#workflow" className={cn(buttonVariants({ variant: "outline" }), "cursor-pointer")}>
              <span className="section-button__title relative z-10 inline-flex items-center gap-2">Explore Platform</span>
              <span className="section-button__circle" aria-hidden="true" />
            </a>
          </div>
        </div>
        <div className="pointer-events-none relative hidden h-[52vh] md:block" aria-hidden="true">
          {cards.map((card, index) => (
            <div
              key={card.src}
              className={`absolute border border-border shadow-[0_20px_60px_rgb(0_0_0/0.35)] ${card.className}`}
              style={{ transform: "translate3d(var(--px, 0px), var(--py, 0px), 0)" }}
            >
              <img
                src={card.src}
                alt=""
                decoding="async"
                className="hero-float block h-auto w-full object-cover"
                style={{ animationDelay: `${280 + index * 90}ms` }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
