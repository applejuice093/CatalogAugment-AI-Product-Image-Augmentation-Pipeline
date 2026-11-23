import { Settings, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export type WorkspaceTab =
  | "products"
  | "studio"
  | "gallery"
  | "intelligence"
  | "quality"
  | "evaluation"
  | "datasets"
  | "workflows";

export interface WorkspaceNavbarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  pendingReviewsCount?: number;
  onOpenSettings: () => void;
  onExitWorkspace: () => void;
  user?: { name?: string | null; email?: string | null; id?: string } | null;
  onSignOut?: () => void;
}

interface NavTabItem {
  id: WorkspaceTab;
  label: string;
  badge?: number;
}

export function WorkspaceNavbar({
  activeTab,
  onSelectTab,
  pendingReviewsCount = 0,
  onOpenSettings,
  onExitWorkspace,
}: WorkspaceNavbarProps) {
  const tabs: NavTabItem[] = [
    { id: "products", label: "Catalog" },
    { id: "studio", label: "Studio" },
    { id: "gallery", label: "Gallery" },
    { id: "intelligence", label: "Intelligence" },
    { id: "quality", label: "Quality", badge: pendingReviewsCount > 0 ? pendingReviewsCount : undefined },
    { id: "evaluation", label: "Benchmarks" },
    { id: "datasets", label: "Datasets" },
    { id: "workflows", label: "Workflows" },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#101210]/90 backdrop-blur-md transition-colors duration-200">
      <div className="mx-auto flex w-full max-w-[1760px] items-center justify-between px-4 sm:px-8 lg:px-12 xl:px-16 h-14">
        {/* Brand & Exit Back to Landing */}
        <div className="flex items-center gap-3">
          <a
            href="#platform"
            onClick={(e) => {
              e.preventDefault();
              onExitWorkspace();
            }}
            className="font-heading text-base font-semibold tracking-[-0.03em] flex items-center gap-2 text-foreground hover:opacity-85 transition-opacity"
          >
            CatalogAugment
          </a>
          <span className="hidden sm:inline-flex text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary">
            Studio
          </span>
        </div>

        {/* Center: Horizontal SPA Navigation Tabs (Same style as landing page navbar) */}
        <nav className="overflow-x-auto no-scrollbar py-1" aria-label="Workspaces">
          <ul className="flex items-center gap-1 sm:gap-2 md:gap-5">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <li key={tab.id} className="flex-shrink-0">
                  <a
                    href={`#${tab.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onSelectTab(tab.id);
                    }}
                    aria-current={isActive ? "true" : undefined}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs tracking-wide rounded-md transition-all duration-150 cursor-pointer ${
                      isActive
                        ? "text-foreground font-semibold bg-white/5 border border-white/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-500/20 text-amber-300 font-mono font-medium">
                        {tab.badge}
                      </span>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Right Actions: Setting Icon & Exit */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Everything related to setting in this setting icon button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenSettings}
            title="System Settings & Endpoints"
            aria-label="Open System Settings"
            className="size-8 p-0 border-white/10 hover:border-primary/40 hover:bg-white/5 hover:text-primary transition-all cursor-pointer"
          >
            <Settings className="size-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onExitWorkspace}
            title="Return to Home"
            aria-label="Return to Home"
            className="h-8 px-2 sm:px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            <span className="hidden sm:inline">Home</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
