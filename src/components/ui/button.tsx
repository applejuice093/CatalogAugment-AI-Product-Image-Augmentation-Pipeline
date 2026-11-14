import { forwardRef, type ElementRef } from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "section-button group/button inline-flex shrink-0 items-center justify-center font-semibold tracking-tight whitespace-nowrap transition-all outline-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "section-button--primary text-primary-foreground",
        outline: "section-button--outline text-foreground",
        secondary: "section-button--dark text-foreground",
        ghost: "section-button--ghost text-muted-foreground hover:text-foreground",
        destructive: "section-button--outline !text-destructive hover:!border-destructive/50",
        link: "!h-auto !p-0 !bg-none !border-0 text-primary underline-offset-4 hover:underline !shadow-none !backdrop-blur-none",
      },
      size: {
        default: "h-11 px-5 text-sm rounded-full",
        xs: "h-7 px-3 text-xs rounded-full",
        sm: "h-9 px-4 text-xs rounded-full",
        lg: "h-12 px-7 text-base rounded-full",
        icon: "size-11 rounded-full p-0",
        "icon-xs": "size-7 rounded-full p-0",
        "icon-sm": "size-9 rounded-full p-0",
        "icon-lg": "size-12 rounded-full p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants>;

export const Button = forwardRef<ElementRef<typeof ButtonPrimitive>, ButtonProps>(
  function Button({ className, variant = "default", size = "default", children, ...props }, ref) {
    if (variant === "link") {
      return (
        <ButtonPrimitive
          ref={ref}
          data-slot="button"
          className={cn(buttonVariants({ variant, size, className }))}
          {...props}
        >
          {children}
        </ButtonPrimitive>
      );
    }

    return (
      <ButtonPrimitive
        ref={ref}
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        <span className="section-button__title relative z-10 inline-flex items-center gap-2">
          {children}
        </span>
        <span className="section-button__circle" aria-hidden="true" />
      </ButtonPrimitive>
    );
  }
);

export { buttonVariants };
