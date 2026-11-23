import { useEffect, useRef } from "react";
import { animate, splitText, stagger } from "animejs";
import { authClient } from "@/lib/auth-client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { scrollState } from "@/lib/scroll";
import { LightningGlowText } from "@/components/effects/LightningGlowText";

const cards = [
  {
    src: "/images/lifestyle.jpg",
    alt: "Running shoe in a lifestyle interior",
    className: "left-[-2%] xl:left-[-4%] top-[6%] w-36 sm:w-44 md:w-52 lg:w-60 xl:w-68",
  },
  {
    src: "/images/outdoor.jpg",
    alt: "Running shoe outdoors",
    className: "right-[0%] lg:-right-[4%] xl:-right-[6%] top-[14%] w-34 sm:w-42 md:w-48 lg:w-56 xl:w-64",
  },
  {
    src: "/images/commercial.jpg",
    alt: "Running shoe in a commercial setup",
    className: "bottom-[2%] left-[22%] lg:left-[26%] xl:left-[28%] w-34 sm:w-42 md:w-48 lg:w-56 xl:w-64",
  },
];

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { data } = authClient.useSession();
  const user = data?.user;

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {});
    }
  }, []);

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
      className="relative z-10 flex min-h-[100dvh] items-center overflow-hidden px-6 sm:px-10 lg:px-16 xl:px-24 pt-24 pb-16"
    >
      {/* Background Video Layer - Looping, muted, reduced opacity for readable text */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster="/videos/poster.jpg"
          className="h-full w-full object-cover opacity-30 md:opacity-40 filter brightness-[0.95] contrast-[1.05] transition-opacity duration-700"
        >
          <source src="/videos/hero-background.mp4" type="video/mp4" />
          <source src="/videos/grok-video-b0292768-ed8e-42c3-b055-b829942dff03.mp4" type="video/mp4" />
        </video>

        {/* Text protection: Deep horizontal gradient darkening the left content side */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#101210_0%,rgb(16_18_16/0.90)_30%,rgb(16_18_16/0.35)_55%,transparent_75%)]" />

        {/* Seamless edge blending: Top and bottom fades */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#101210_0%,transparent_16%,transparent_84%,#101210_100%)]" />

        {/* Subtle radial ambient vignette that keeps the video open and visible across the wide viewport */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgb(16_18_16/0.75)_95%)]" />
      </div>
      <div className="relative z-10 mx-auto grid w-full max-w-[1760px] items-center gap-10 lg:gap-16 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="max-w-xl lg:max-w-2xl xl:max-w-3xl">
          <LightningGlowText
            as="h1"
            data-hero-title=""
            className="text-[clamp(2.4rem,4.2vw,4.1rem)] leading-[1.06] font-semibold tracking-[-0.04em]"
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

          <p data-hero-reveal className="mt-6 max-w-xl text-base md:text-lg lg:text-xl leading-relaxed text-muted-foreground opacity-0">
            Turn one product photograph into a varied set that still reads as the same product.
          </p>
          <div data-hero-reveal className="mt-8 flex flex-wrap items-center gap-4 opacity-0">
            <a
              href={user ? "#products" : "#login?redirect=products"}
              className={cn(
                buttonVariants(),
                "h-11 px-5 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(214,227,106,0.3)]",
              )}
            >
              <span className="section-button__title relative z-10 inline-flex items-center gap-2">
                Launch Studio Workspace
              </span>
              <span className="section-button__circle" aria-hidden="true" />
            </a>
          </div>

          <div data-hero-reveal className="mt-4 opacity-0">
            <a
              href="#workflow"
              className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              Explore Platform →
            </a>
          </div>
        </div>
        <div className="pointer-events-none relative hidden h-[58vh] lg:h-[66vh] xl:h-[72vh] md:block w-full" aria-hidden="true">
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
