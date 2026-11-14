import { useState } from "react";
import { TextPathStudies } from "@/shaders/text-path-studies/TextPathStudies";
import { Button } from "@/components/ui/button";
import { Sparkles, Move, Eye, ShieldCheck, Cpu } from "lucide-react";

export function CurtainReveal() {
  const [curtainActive, setCurtainActive] = useState(true);

  return (
    <section
      id="reveal"
      className="relative z-20 py-24 px-5 bg-background border-y border-border/40 overflow-hidden"
    >
      <div className="mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-mono uppercase tracking-widest mb-4">
              <Sparkles className="size-3.5" />
              <span>Physical Curtains // Master Artifact</span>
            </div>
            <h2 className="section-title text-[clamp(2rem,3.2vw,3.2rem)] font-bold tracking-tight">
              A grand product behind curtains.
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl text-base md:text-lg">
              Grab, drag, and brush across the live Verlet cloth weave to reveal the pristine studio master artifact staged within the spotlight chamber.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant={curtainActive ? "default" : "outline"}
              size="sm"
              onClick={() => setCurtainActive((prev) => !prev)}
              className="cursor-pointer text-xs"
            >
              <Eye className="size-3.5 mr-1" />
              {curtainActive ? "Curtain: Active Weave" : "Curtain: Hidden"}
            </Button>
            <a href="#showcase">
              <Button variant="outline" size="sm" className="cursor-pointer text-xs">
                Inspect Augmentations
              </Button>
            </a>
          </div>
        </div>

        {/* Stage Container: The Product Chamber */}
        <div className="relative w-full h-[580px] md:h-[720px] rounded-3xl border border-white/10 bg-[#060709] overflow-hidden shadow-2xl isolate select-none">
          {/* Overhead Dramatic Volumetric Keylight Cone */}
          <div
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              background:
                "radial-gradient(ellipse 65% 55% at 50% 0%, rgba(214, 227, 106, 0.28) 0%, rgba(214, 227, 106, 0.08) 45%, transparent 75%)",
            }}
          />

          {/* Deep Ambient Vignette & Fog */}
          <div
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, transparent 40%, rgba(6, 7, 9, 0.85) 100%)",
            }}
          />

          {/* Grand Pedestal & Platform at bottom */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-[72%] max-w-2xl h-36 pointer-events-none z-0">
            {/* Glowing pedestal ellipse */}
            <div
              className="w-full h-full rounded-[100%] border border-[#d6e36a]/30 shadow-[0_0_60px_rgba(214,227,106,0.2)]"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 50%, rgba(214, 227, 106, 0.15) 0%, rgba(20, 24, 20, 0.85) 65%, transparent 100%)",
              }}
            />
            {/* Concentric inner illuminated rings */}
            <div className="absolute inset-6 rounded-[100%] border border-[#d6e36a]/20" />
            <div className="absolute inset-12 rounded-[100%] border border-white/10" />
          </div>

          {/* BEHIND CURTAINS: The Grand Product */}
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
            {/* Aura glow behind the shoe */}
            <div
              className="absolute w-[360px] md:w-[480px] h-[360px] rounded-full blur-3xl opacity-60 pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle, rgba(214, 227, 106, 0.35) 0%, rgba(78, 116, 255, 0.2) 60%, transparent 80%)",
              }}
            />

            {/* The Master Artifact Image */}
            <div className="relative z-10 w-[85%] max-w-lg md:max-w-xl transition-transform duration-500 hover:scale-105">
              <img
                src="/images/studio.jpg"
                alt="Grand Master Product — Black and White Mesh Runner"
                className="w-full h-auto object-contain drop-shadow-[0_20px_45px_rgba(0,0,0,0.85)] filter contrast-105 brightness-105 rounded-2xl"
              />

              {/* Floating Laboratory Telemetry Callouts */}
              <div className="hidden md:flex absolute -top-4 -left-6 items-center gap-2 px-3 py-1.5 rounded-lg border border-white/15 bg-black/75 backdrop-blur-md text-[11px] text-zinc-300 font-mono tracking-tight shadow-xl">
                <Cpu className="size-3.5 text-primary" />
                <span>SPEC // 4K HIGH-FIDELITY MESH</span>
              </div>

              <div className="hidden md:flex absolute -bottom-2 -right-4 items-center gap-2 px-3 py-1.5 rounded-lg border border-white/15 bg-black/75 backdrop-blur-md text-[11px] text-zinc-300 font-mono tracking-tight shadow-xl">
                <ShieldCheck className="size-3.5 text-primary" />
                <span>RAW UNPROCESSED MASTER ARCHIVE</span>
              </div>
            </div>

            {/* Product Title Badge directly on chamber base */}
            <div className="relative z-10 mt-6 text-center">
              <p className="text-xs uppercase font-mono tracking-[0.28em] text-[#d6e36a]">
                Product Master S-01
              </p>
              <h3 className="text-xl md:text-2xl font-bold tracking-tight text-white mt-1">
                Precision Mesh Technical Runner
              </h3>
            </div>
          </div>

          {/* FOREGROUND CURTAIN: The Live Verlet Cloth Study */}
          {curtainActive && (
            <div className="absolute inset-0 z-20 pointer-events-auto cursor-grab active:cursor-grabbing">
              <TextPathStudies
                variant="cloth-study"
                mode="dark"
                transparent={true}
                scale={1.02}
                className="w-full h-full"
              />
            </div>
          )}

          {/* Interactive User Hint Pill Overlay */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-white/15 bg-black/60 backdrop-blur-md text-xs text-white/90 shadow-lg">
              <Move className="size-3.5 text-primary animate-pulse" />
              <span>
                <strong>Curtain Interactivity:</strong> Drag or brush across the letter weave to part the cloth
              </span>
            </div>
          </div>

          {/* Bottom Chamber Status Bar */}
          <div className="absolute bottom-4 inset-x-6 z-30 flex items-center justify-between text-[11px] font-mono text-zinc-400 pointer-events-none">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-primary inline-block animate-ping" />
              VERLET CLOTH: 399 ACTIVE PARTICLES
            </span>
            <span className="hidden sm:inline">
              SHEAR CONSTRAINTS: 6 PER NODE · SPRING DAMPING: 0.992
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
