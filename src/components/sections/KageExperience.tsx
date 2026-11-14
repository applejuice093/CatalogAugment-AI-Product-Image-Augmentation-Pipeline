import { Scene } from "@/components/scenes/Scene";

export function KageExperience() {
  return (
    <section id="kage-experience" className="relative z-10 w-full overflow-hidden border-t border-border/40 py-20 bg-background/90">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-primary font-mono">
              ThreeUI Interactive World
            </span>
            <h2 className="font-heading text-3xl font-semibold tracking-tight mt-2 text-foreground">
              Kage — Temple of Stillness
            </h2>
            <p className="text-muted-foreground mt-2 max-w-xl text-sm">
              The complete authored Kage temple experience with interactive navigation, parallax scroll scenes, and real-time Three.js spatial atmosphere.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>WebGL 3D Active</span>
          </div>
        </div>
        <div className="relative w-full h-[700px] rounded-2xl overflow-hidden border border-border shadow-2xl bg-[#080808]">
          <Scene />
        </div>
      </div>
    </section>
  );
}
