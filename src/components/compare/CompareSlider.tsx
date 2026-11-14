import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

type CompareSliderProps = {
  before: string;
  after: string;
  beforeAlt: string;
  afterAlt: string;
  className?: string;
};

export function CompareSlider({ before, after, beforeAlt, afterAlt, className }: CompareSliderProps) {
  const [value, setValue] = useState(58);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('[data-slot="slider"]')) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const update = (clientX: number) => {
      const pct = Math.min(98, Math.max(2, Math.round(((clientX - rect.left) / rect.width) * 100)));
      setValue(pct);
    };
    update(event.clientX);
    const onMove = (e: PointerEvent) => update(e.clientX);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      className={cn(
        "relative aspect-square overflow-hidden border border-border bg-card group cursor-ew-resize select-none",
        className,
      )}
    >
      <img
        src={after}
        alt={afterAlt}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <img
        src={before}
        alt={beforeAlt}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: `inset(0 ${100 - value}% 0 0)` }}
      />

      {/* Floating Corner Context Tags */}
      <div className="pointer-events-none absolute top-3 left-3 z-20 flex items-center gap-1.5 rounded-xs border border-border bg-[#101210]/85 px-2 py-1 text-[10px] font-medium tracking-wider uppercase text-muted-foreground backdrop-blur-xs">
        Studio Baseline
      </div>
      <div className="pointer-events-none absolute top-3 right-3 z-20 flex items-center gap-1.5 rounded-xs border border-primary/30 bg-[#101210]/85 px-2 py-1 text-[10px] font-medium tracking-wider uppercase text-primary backdrop-blur-xs">
        Augmented
      </div>

      {/* Divider line & central grip badge */}
      <div
        className="pointer-events-none absolute inset-y-0 z-20 w-px bg-foreground"
        style={{ left: `${value}%` }}
      >
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex h-6 w-6 items-center justify-center rounded-full border border-primary bg-[#101210] text-[10px] text-primary shadow-[0_0_12px_rgba(214,227,106,0.35)]"
          aria-hidden="true"
        >
          ↔
        </div>
      </div>

      <div className="absolute inset-x-6 bottom-5 z-20">
        <Slider
          aria-label="Compare studio photograph with the selected environment"
          min={2}
          max={98}
          step={1}
          value={[value]}
          onValueChange={(next) => {
            const amount = Array.isArray(next) ? next[0] : next;
            if (typeof amount === "number") setValue(amount);
          }}
        />
      </div>
    </div>
  );
}
