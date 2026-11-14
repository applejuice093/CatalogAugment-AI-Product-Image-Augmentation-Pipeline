import { type ComponentPropsWithoutRef, type ElementType, type ReactNode } from "react";
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
  shaderClassName: _shaderClassName,
  speed: _speed,
  size: _size,
  particleAmount: _particleAmount,
  hue: _hue,
  saturation: _saturation,
  brightness: _brightness,
  opacity: _opacity,
  showShader = true,
  ...rest
}: LightningGlowTextProps<T>) {
  const Component = as || "h1";

  return (
    <div className={cn("relative inline-block w-full isolate", containerClassName)}>
      {/* Clean ambient radial glow backdrop without any background logo marks or letters */}
      {showShader ? (
        <div
          className="pointer-events-none absolute -inset-x-12 -inset-y-8 z-0 overflow-hidden select-none opacity-60 blur-2xl"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(214, 227, 106, 0.18) 0%, rgba(130, 200, 255, 0.08) 45%, transparent 80%)",
          }}
          aria-hidden="true"
        />
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
