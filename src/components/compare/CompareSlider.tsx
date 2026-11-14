import { useState } from "react";
import { Slider } from "@/components/ui/slider";

type CompareSliderProps = {
  before: string;
  after: string;
  beforeAlt: string;
  afterAlt: string;
};

export function CompareSlider({ before, after, beforeAlt, afterAlt }: CompareSliderProps) {
  const [value, setValue] = useState(58);

  return (
    <div className="relative aspect-square overflow-hidden border border-border bg-card">
      <img src={after} alt={afterAlt} className="absolute inset-0 h-full w-full object-cover" />
      <img
        src={before}
        alt={beforeAlt}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: `inset(0 ${100 - value}% 0 0)` }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 w-px bg-foreground"
        style={{ left: `${value}%` }}
      />
      <div className="absolute inset-x-6 bottom-5">
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
