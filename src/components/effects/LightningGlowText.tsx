import { type ComponentPropsWithoutRef, type ElementType, type ReactNode } from "react";
import { ElementsCollection } from "@/shaders/elements/ElementsBackground";
import { cn } from "@/lib/utils";

export type LightningGlowTextProps<T extends ElementType = "h1"> = {
  as?: T;
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  shaderClassName?: string;
  speed?: number;
  size?: number;
  particleAmount?: number;
  hue?: number;
  saturation?: number;
  brightness?: number;
  opacity?: number;
  showShader?: boolean;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

export function LightningGlowText<T extends ElementType = "h1">({
  as,
  children,
  className,
  containerClassName,
  shaderClassName,
  speed = 1.0,
  size = 1.15,
  particleAmount = 1.3,
  hue = -55,
  saturation = 1.25,
  brightness = 1.35,
  opacity = 0.9,
  showShader = true,
  ...rest
}: LightningGlowTextProps<T>) {
  const Component = as || "h1";

  return (
    <div className={cn("relative inline-block w-full isolate", containerClassName)}>
      {showShader ? (
        <div
          className={cn(
            "pointer-events-none absolute -inset-x-20 -inset-y-16 z-0 overflow-hidden mix-blend-screen select-none",
            shaderClassName,
          )}
          style={{
            maskImage:
              "radial-gradient(ellipse 65% 55% at 50% 50%, rgba(0,0,0,1) 20%, rgba(0,0,0,0.85) 50%, rgba(0,0,0,0.3) 75%, transparent 95%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 65% 55% at 50% 50%, rgba(0,0,0,1) 20%, rgba(0,0,0,0.85) 50%, rgba(0,0,0,0.3) 75%, transparent 95%)",
          }}
          aria-hidden="true"
        >
          <ElementsCollection
            variant="lightning"
            speed={speed}
            size={size}
            particleAmount={particleAmount}
            hue={hue}
            saturation={saturation}
            brightness={brightness}
            opacity={opacity}
            style={{ background: "#000000" }}
            className="h-full w-full"
          />
        </div>
      ) : null}

      <Component
        className={cn(
          "relative z-10 font-heading text-foreground lightning-text-glow",
          className,
        )}
        {...(rest as any)}
      >
        {children}
      </Component>
    </div>
  );
}
