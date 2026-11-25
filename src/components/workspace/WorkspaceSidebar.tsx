import React from "react";
import {
  LayoutDashboard,
  Package,
  Wand2,
  Images,
  Sparkles,
  ShieldCheck,
  Database,
  LineChart,
  Settings,
  Layers,
} from "lucide-react";

export type WorkspaceTab =
  | "dashboard"
  | "products"
  | "studio"
  | "gallery"
  | "intelligence"
  | "quality"
  | "datasets"
  | "evaluation"
  | "settings";

interface WorkspaceSidebarProps {
  currentTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  pendingReviewsCount?: number;
}

interface NavItem {
  id: WorkspaceTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  highlight?: boolean;
}

export function WorkspaceSidebar({
  currentTab,
  onSelectTab,
  pendingReviewsCount = 0,
}: WorkspaceSidebarProps) {
  const navItems: NavItem[] = [
    { id: "dashboard", label: "Overview", icon: LayoutDashboard },
    { id: "products", label: "Product Library", icon: Package },
    { id: "studio", label: "Augmentation Studio", icon: Wand2, highlight: true },
    { id: "gallery", label: "Variant Gallery", icon: Images },
    { id: "intelligence", label: "Product Intelligence", icon: Sparkles },
    {
      id: "quality",
      label: "Quality Review",
      icon: ShieldCheck,
      badge: pendingReviewsCount > 0 ? pendingReviewsCount : undefined,
    },
    { id: "datasets", label: "Dataset Manager", icon: Database },
    { id: "evaluation", label: "Visual Search Eval", icon: LineChart },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col justify-between border-r border-border/60 bg-[#090b0e] h-[calc(100vh-4rem)]">
      {/* Brand & Main Navigation */}
      <div className="flex flex-col p-4 gap-6 overflow-y-auto">
        {/* Brand header */}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/30 text-primary">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold tracking-tight text-foreground font-mono">
                CatalogAugment
              </span>
              <span className="rounded bg-primary/20 px-1 py-0.2 text-[9px] font-semibold text-primary">
                AI
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">E-Commerce Pipeline</p>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex flex-col gap-1">
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            Pipeline Operations
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150 cursor-pointer ${
                  isActive
                    ? "bg-primary/15 text-primary border border-primary/30 shadow-[0_0_12px_rgba(214,227,106,0.12)] font-semibold"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`h-4 w-4 transition-colors ${
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500/20 px-1.5 text-[10px] font-bold text-amber-400 border border-amber-500/30">
                    {item.badge}
                  </span>
                )}
                {item.highlight && !isActive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer System Status Banner */}
      <div className="border-t border-border/40 p-4 bg-[#07080c]/60">
        <div className="rounded-lg border border-border/60 bg-[#121417] p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Pipeline Engine
            </span>
            <span className="text-[10px] font-mono text-emerald-400">ONLINE</span>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground leading-relaxed">
            ComfyUI (8188) & Ollama (11434) connected for automated catalog augmentation.
          </p>
        </div>
      </div>
    </aside>
  );
}
