import { useState, useRef } from "react";
import { technologies, type TechnologyItem } from "@/data/content";
import { TechIcon } from "./tech-icons";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  ExternalLink,
  Layers,
  Sparkles,
  CheckCircle2,
  Clock,
  Terminal,
  Cpu,
  Database,
  MonitorCheck,
  ChevronRight,
} from "lucide-react";

type TechnologyProps = {
  active: string;
  onSelect: (id: string) => void;
};

type FilterCategory = "all" | "client" | "ai" | "data";

const filterTabs: { id: FilterCategory; label: string; count: number; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "all", label: "All Pipeline Layers", count: 7, icon: Layers },
  { id: "client", label: "Client & Interface", count: 2, icon: MonitorCheck },
  { id: "ai", label: "Inference & Generative AI", count: 3, icon: Cpu },
  { id: "data", label: "Persistence & Storage", count: 2, icon: Database },
];

export function Technology({ active, onSelect }: TechnologyProps) {
  const root = useRef<HTMLElement>(null);
  const [filter, setFilter] = useState<FilterCategory>("all");

  const selected: TechnologyItem =
    technologies.find((item) => item.id === active) ?? technologies[0];

  const filteredTechnologies =
    filter === "all"
      ? technologies
      : technologies.filter((item) => item.category === filter);

  return (
    <section
      id="technology"
      data-scene="technology"
      ref={root}
      className="relative z-10 bg-[#101210] px-6 sm:px-10 lg:px-16 xl:px-24 py-28 border-t border-border/40"
    >
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-40 right-1/4 h-[500px] w-[500px] rounded-full blur-[140px] opacity-15 transition-all duration-700"
          style={{ backgroundColor: selected.brandColor }}
        />
        <div className="absolute bottom-0 left-10 h-72 w-72 rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-[1760px]">
        {/* Section Header */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/40 bg-primary/5 text-primary text-xs font-mono uppercase tracking-widest">
              <Sparkles className="size-3 mr-1.5 inline" />
              Core Architecture & Tech Stack
            </Badge>
          </div>
          <h2 className="section-title text-[clamp(2.1rem,3.4vw,3.4rem)] font-bold tracking-tight">
            An intelligent pipeline. Built for scale.
          </h2>
          <p className="max-w-3xl text-base md:text-lg text-muted-foreground leading-relaxed">
            Every layer from client-side WebGL canvas manipulation to latent space diffusion conditioning and zero-overhead filesystem caching is built for deterministic product reproduction.
          </p>
        </div>

        {/* Category Filters Bar */}
        <div className="mt-10 flex flex-wrap items-center gap-2 border-b border-border/50 pb-5">
          {filterTabs.map((tab) => {
            const Icon = tab.icon;
            const isTabActive = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`group flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition-all duration-200 cursor-pointer ${
                  isTabActive
                    ? "bg-primary text-primary-foreground shadow-[0_0_16px_rgba(214,227,106,0.35)]"
                    : "bg-card/60 text-muted-foreground hover:bg-card hover:text-foreground border border-border/50"
                }`}
              >
                <Icon className={`size-3.5 transition-transform group-hover:scale-110 ${isTabActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"}`} />
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-mono ${
                    isTabActive
                      ? "bg-black/25 text-primary-foreground"
                      : "bg-white/10 text-muted-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Main Showcase Layout: Tech Grid + Inspector Panel */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] xl:grid-cols-[1.2fr_0.8fr] items-start">
          {/* Tech Tiles Matrix */}
          <div className="grid gap-3.5 sm:grid-cols-2">
            {filteredTechnologies.map((item) => {
              const isSelected = item.id === selected.id;
              return (
                <div
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(item.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300 cursor-pointer ${
                    isSelected
                      ? "bg-card/90 shadow-2xl"
                      : "bg-card/40 hover:bg-card/70 border-white/10 hover:border-white/20"
                  }`}
                  style={{
                    borderColor: isSelected ? item.brandColor : undefined,
                    boxShadow: isSelected
                      ? `0 0 24px ${item.glowColor}, inset 0 0 16px ${item.glowColor}22`
                      : undefined,
                  }}
                >
                  {/* Subtle active brand gradient aura */}
                  {isSelected && (
                    <div
                      className="pointer-events-none absolute -inset-px rounded-2xl opacity-20 blur-md transition-opacity duration-500"
                      style={{
                        background: `radial-gradient(circle at 15% 20%, ${item.brandColor}, transparent 70%)`,
                      }}
                    />
                  )}

                  {/* Tile Header: Glowing Icon + Status Badge */}
                  <div className="relative z-10 flex items-start justify-between gap-3">
                    {/* Real Icon with Brand Glow Frame */}
                    <div
                      className="relative flex size-12 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 group-hover:scale-105"
                      style={{
                        backgroundColor: `${item.brandColor}18`,
                        borderColor: isSelected ? item.brandColor : `${item.brandColor}40`,
                        boxShadow: isSelected
                          ? `0 0 18px ${item.glowColor}, inset 0 0 10px ${item.glowColor}`
                          : `0 0 10px ${item.glowColor}33`,
                      }}
                    >
                      {/* Ambient blur glow halo */}
                      <div
                        className="absolute inset-0 rounded-xl opacity-40 blur-xs"
                        style={{ backgroundColor: item.glowColor }}
                      />
                      <TechIcon
                        id={item.id}
                        className="relative z-10 size-7 transition-all duration-300 group-hover:scale-110"
                        style={{
                          filter: isSelected
                            ? `drop-shadow(0 0 8px ${item.brandColor}) drop-shadow(0 0 16px ${item.brandColor}99)`
                            : `drop-shadow(0 0 5px ${item.brandColor}66)`,
                        }}
                      />
                    </div>

                    {/* Implementation Status Pill */}
                    <div
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-mono tracking-wider uppercase transition-colors ${
                        item.implemented
                          ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                          : "border border-amber-500/30 bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          item.implemented
                            ? "bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse"
                            : "bg-amber-400"
                        }`}
                      />
                      <span>{item.implemented ? "Engine Active" : "Target Pipeline"}</span>
                    </div>
                  </div>

                  {/* Tile Body: Name, Role & Category */}
                  <div className="relative z-10 mt-5">
                    <div className="flex items-center justify-between">
                      <h3
                        className="text-lg font-semibold tracking-tight transition-colors group-hover:text-primary"
                        style={{ color: isSelected ? item.brandColor : undefined }}
                      >
                        {item.name}
                      </h3>
                      <ChevronRight
                        className={`size-4 transition-transform group-hover:translate-x-1 ${
                          isSelected ? "text-primary opacity-100" : "text-muted-foreground opacity-40 group-hover:opacity-100"
                        }`}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                      {item.role}
                    </p>
                  </div>

                  {/* Tile Footer Spec Tags */}
                  <div className="relative z-10 mt-4 flex flex-wrap gap-1.5 pt-3 border-t border-white/5">
                    {item.specs.slice(0, 2).map((spec) => (
                      <span
                        key={spec.label}
                        className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] font-mono text-muted-foreground"
                      >
                        {spec.value}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Deep Architecture Inspector Terminal (Right Column) */}
          <Card
            className="sticky top-24 overflow-hidden rounded-2xl border bg-[#0d0f0d]/95 p-6 backdrop-blur-xl shadow-2xl transition-all duration-500"
            style={{
              borderColor: `${selected.brandColor}50`,
              boxShadow: `0 0 35px ${selected.glowColor}25, 0 20px 40px rgba(0,0,0,0.6)`,
            }}
          >
            {/* Ambient Corner Flare */}
            <div
              className="pointer-events-none absolute -top-16 -right-16 size-44 rounded-full blur-[60px] opacity-25"
              style={{ backgroundColor: selected.brandColor }}
            />

            {/* Inspector Header */}
            <div className="relative z-10 flex items-start gap-4 border-b border-white/10 pb-5">
              {/* Large Glowing Icon Showcase */}
              <div
                className="relative flex size-16 shrink-0 items-center justify-center rounded-2xl border transition-all duration-500"
                style={{
                  backgroundColor: `${selected.brandColor}18`,
                  borderColor: selected.brandColor,
                  boxShadow: `0 0 25px ${selected.glowColor}, inset 0 0 14px ${selected.glowColor}`,
                }}
              >
                {/* Dual Pulsing Orbital Glow */}
                <div
                  className="absolute -inset-1 rounded-2xl opacity-40 blur-md animate-pulse"
                  style={{ backgroundColor: selected.glowColor }}
                />
                <TechIcon
                  id={selected.id}
                  className="relative z-10 size-9 transition-transform duration-300"
                  style={{
                    filter: `drop-shadow(0 0 10px ${selected.brandColor}) drop-shadow(0 0 18px ${selected.brandColor})`,
                  }}
                />
              </div>

              {/* Title & Metadata */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                    {selected.categoryLabel}
                  </span>
                  <span className="text-white/20">•</span>
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-mono font-medium"
                    style={{ color: selected.brandColor }}
                  >
                    {selected.implemented ? (
                      <>
                        <CheckCircle2 className="size-3" />
                        Running in Runtime
                      </>
                    ) : (
                      <>
                        <Clock className="size-3" />
                        Planned Target
                      </>
                    )}
                  </span>
                </div>
                <h3 className="mt-1 text-2xl font-bold tracking-tight text-foreground truncate">
                  {selected.name}
                </h3>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">
                  {selected.role}
                </p>
              </div>
            </div>

            {/* Core Pipeline Role Narrative */}
            <div className="relative z-10 mt-5">
              <span className="text-xs font-mono uppercase tracking-wider text-primary font-medium">
                Pipeline Responsibility
              </span>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {selected.responsibility}
              </p>
            </div>

            {/* Technical Capability Specs */}
            <div className="relative z-10 mt-6">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-medium">
                Architecture Specs
              </span>
              <div className="mt-2.5 grid grid-cols-3 gap-2">
                {selected.specs.map((spec) => (
                  <div
                    key={spec.label}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-center transition-colors hover:border-white/20"
                  >
                    <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">
                      {spec.label}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-foreground truncate">
                      {spec.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Architecture Code / Config Snippet */}
            {selected.snippet && (
              <div className="relative z-10 mt-6 overflow-hidden rounded-xl border border-white/10 bg-black/60">
                <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/10 bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <Terminal className="size-3.5 text-muted-foreground" />
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {selected.id === "comfy" ? "workflow.json" : selected.id === "sql" ? "schema.ts" : "pipeline-spec.ts"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-white/20" />
                    <span className="size-2 rounded-full bg-white/20" />
                    <span className="size-2 rounded-full bg-white/20" />
                  </div>
                </div>
                <pre className="p-3.5 text-[11px] font-mono leading-relaxed text-emerald-300/90 overflow-x-auto selection:bg-primary/20">
                  <code>{selected.snippet}</code>
                </pre>
              </div>
            )}

            {/* Action Footer: Documentation Link */}
            <div className="relative z-10 mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-mono">
                Official specifications & docs
              </span>
              <a
                href={selected.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-1.5 transition-all cursor-pointer hover:shadow-lg"
                style={{
                  backgroundColor: `${selected.brandColor}18`,
                  color: selected.brandColor,
                  border: `1px solid ${selected.brandColor}40`,
                }}
              >
                <span>Read Documentation</span>
                <ExternalLink className="size-3" />
              </a>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
