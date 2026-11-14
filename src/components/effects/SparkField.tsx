import { useEffect, useRef } from "react";
import { animate, createTimer, stagger, utils } from "animejs";
import { scrollState } from "@/lib/scroll";

type Spark = {
  x: number;
  y: number;
  alpha: number;
  size: number;
  color: string;
};

const counts = { desktop: 54, tablet: 32, mobile: 18 };

function makeSparks(width: number, height: number, count: number): Spark[] {
  return Array.from({ length: count }, () => {
    const x = utils.random(width * 0.42, width * 0.96);
    const y = utils.random(height * 0.06, height * 0.92);
    return {
      x,
      y,
      alpha: utils.random(0.45, 0.9, 2),
      size: utils.random(1.6, 3.1, 1),
      color: utils.random() > 0.4 ? "#d6e36a" : "#e8e6df",
    };
  });
}

export function SparkField() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const node = canvas.current;
    if (!node) return;
    const context = node.getContext("2d");
    if (!context) return;

    let sparks: Spark[] = [];
    let motions: Array<{ revert: () => void }> = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;
      node.width = Math.round(width * dpr);
      node.height = Math.round(height * dpr);
      node.style.width = `${width}px`;
      node.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const shiftX = scrollState.reduced ? 0 : scrollState.mouseX * 10;
      const shiftY = scrollState.reduced ? 0 : scrollState.mouseY * 6;
      context.clearRect(0, 0, width, height);
      for (const spark of sparks) {
        const x = spark.x + shiftX;
        const y = spark.y + shiftY;
        context.strokeStyle = spark.color;
        context.fillStyle = spark.color;
        context.lineCap = "round";
        context.lineWidth = 1.25;
        context.globalAlpha = spark.alpha * 0.7;
        context.beginPath();
        context.moveTo(x, y + spark.size * 5);
        context.lineTo(x, y);
        context.stroke();
        context.globalAlpha = spark.alpha;
        context.beginPath();
        context.arc(x, y, spark.size, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
    };

    const boot = () => {
      motions.forEach((item) => item.revert());
      motions = [];
      resize();
      const count = counts[scrollState.tier];
      sparks = makeSparks(window.innerWidth, window.innerHeight, count);
      draw();
      if (scrollState.reduced) return;
      const delayFor = stagger(80);
      const alphaFor = stagger([0.15, 0.8]);
      const durationFor = stagger([5200, 9800]);
      motions = sparks.map((spark, index) =>
        animate(spark, {
          x: spark.x + utils.random(-42, 42),
          y: spark.y - utils.random(70, 190),
          alpha: alphaFor(spark, index, sparks),
          delay: delayFor(spark, index, sparks),
          duration: durationFor(spark, index, sparks),
          ease: "inOutSine",
          loop: true,
          alternate: true,
        }),
      );
    };

    boot();
    const timer = createTimer({
      duration: 1000,
      loop: true,
      frameRate: 30,
      autoplay: !scrollState.reduced,
      onUpdate: draw,
    });

    const onResize = () => boot();
    const onVisibility = () => {
      if (document.hidden || scrollState.reduced) timer.pause();
      else timer.play();
    };

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      motions.forEach((item) => item.revert());
      timer.cancel();
    };
  }, []);

  return (
    <canvas
      ref={canvas}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1]"
    />
  );
}
