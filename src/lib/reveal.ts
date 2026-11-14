import { useEffect, type CSSProperties, type RefObject } from "react";
import { animate, onScroll, stagger } from "animejs";
import { scrollState } from "@/lib/scroll";

export function mediaSwap(on: boolean, earlier: boolean): CSSProperties {
  const still = scrollState.reduced || on;
  return {
    opacity: on ? 1 : 0,
    transform: still
      ? "translate3d(0, 0, 0) scale(1)"
      : `translate3d(0, ${earlier ? "-16px" : "16px"}, 0) scale(0.985)`,
  };
}

export function useReveal(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const scope = root.current;
    if (!scope) return;
    const nested = scope.querySelectorAll<HTMLElement>("[data-reveal]");
    const nodes = scope.matches("[data-reveal]") ? [scope, ...nested] : [...nested];
    if (nodes.length === 0) return;
    if (scrollState.reduced) {
      for (const node of nodes) {
        node.style.opacity = "1";
        node.style.transform = "none";
      }
      return;
    }
    const animation = animate(nodes, {
      opacity: [0, 1],
      y: [18, 0],
      delay: stagger(80),
      duration: 700,
      ease: "outExpo",
      autoplay: onScroll({
        target: scope,
        enter: "end start",
        leave: "start end",
      }),
    });
    return () => {
      animation.revert();
    };
  }, [root]);
}
