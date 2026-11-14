import { useEffect, useState } from "react";
import { ArrowLeft, RefreshCw, LogOut, User } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { api, type SystemHealth, type VlmProviderStatus } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface WorkspaceHeaderProps {
  currentView: string;
  onNavigateHome: () => void;
  onRefresh?: () => void;
}

const VIEW_TITLES: Record<string, { title: string; subtitle: string }> = {
  dashboard: {
    title: "Catalog Overview",
    subtitle: "Real-time pipeline metrics, model connectivity, and catalog health",
  },
  products: {
    title: "Product Library",
    subtitle: "Master catalog SKUs, source assets, and automated segmentation masks",
  },
  studio: {
    title: "Augmentation Studio",
    subtitle: "ComfyUI generation workflows with foreground preservation compositing",
  },
  gallery: {
    title: "Augmentation Gallery",
    subtitle: "Interactive Before/After slider comparison, inspection, and review approvals",
  },
  intelligence: {
    title: "Product Intelligence (VLM)",
    subtitle: "Multi-modal visual attribute extraction & semantic consistency verification",
  },
  quality: {
    title: "Quality Control Review Queue",
    subtitle: "Automated multi-modal gating, perceptual similarity, and human audit trail",
  },
  datasets: {
    title: "Dataset Management & Lineage",
    subtitle: "Leakage-free SKU partitioning, versioned manifests, and streaming ZIP export",
  },
  evaluation: {
    title: "Visual Search & Model Evaluation",
    subtitle: "IR retrieval benchmark (Exp A–D) and interactive visual search query probe",
  },
  workflows: {
    title: "ComfyUI Workflows",
    subtitle: "Execution pipeline schemas (WF-01 inpainting, WF-02 relighting, WF-03 lifestyle)",
  },
  settings: {
    title: "System Settings",
    subtitle: "Service endpoints, Ollama & ComfyUI parameters, and QC thresholds",
  },
};

export function WorkspaceHeader({ currentView, onNavigateHome, onRefresh }: WorkspaceHeaderProps) {
  const { data: session } = authClient.useSession();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [ollamaReady, setOllamaReady] = useState<boolean | null>(null);
  const [comfyReady, setComfyReady] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const checkConnectivity = async () => {
    setChecking(true);
    try {
      const h = await api.getHealth();
      setHealth(h);
    } catch {
      setHealth(null);
    }

    try {
      const vlm = await api.getVlmProviders();
      const ollama = vlm.providers.find((p: VlmProviderStatus) => p.provider === "ollama");
      setOllamaReady(ollama?.available ?? false);
    } catch {
      setOllamaReady(false);
    }

    try {
      const wf = await api.getWorkflows();
      setComfyReady(wf.workflows && wf.workflows.length > 0);
    } catch {
      setComfyReady(false);
    }
    setChecking(false);
  };

  useEffect(() => {
    void checkConnectivity();
    const timer = setInterval(() => {
      void checkConnectivity();
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const meta = VIEW_TITLES[currentView] || {
    title: "Application Workspace",
    subtitle: "Synthetic image augmentation & catalog evaluation platform",
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border/60 bg-[#07080c]/90 px-6 backdrop-blur-md">
      {/* View Title & Subtitle */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onNavigateHome}
          className="flex h-9 items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          title="Return to Marketing Landing Page"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Exit Studio</span>
        </Button>
        <div className="h-5 w-px bg-border/60" />
        <div>
          <h1 className="text-base font-semibold tracking-tight text-foreground">{meta.title}</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">{meta.subtitle}</p>
        </div>
      </div>

      {/* Connectivity Status & Actions */}
      <div className="flex items-center gap-3">
        {/* Status Pills */}
        <div className="hidden lg:flex items-center gap-2 border border-border/40 rounded-full px-3 py-1 bg-[#101210]/60 text-xs">
          {/* API / DB */}
          <div className="flex items-center gap-1.5" title="Express API & PostgreSQL Database">
            <span
              className={`h-2 w-2 rounded-full ${
                health?.services.database ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <span className="text-[11px] text-muted-foreground">API/DB</span>
          </div>

          <span className="text-border">|</span>

          {/* ComfyUI */}
          <div className="flex items-center gap-1.5" title="ComfyUI Server (127.0.0.1:8188)">
            <span
              className={`h-2 w-2 rounded-full ${
                comfyReady ? "bg-emerald-500" : "bg-muted-foreground"
              }`}
            />
            <span className="text-[11px] text-muted-foreground">ComfyUI</span>
          </div>

          <span className="text-border">|</span>

          {/* Ollama VLM */}
          <div className="flex items-center gap-1.5" title="Ollama VLM (127.0.0.1:11434 / moondream)">
            <span
              className={`h-2 w-2 rounded-full ${
                ollamaReady ? "bg-emerald-500" : "bg-muted-foreground"
              }`}
            />
            <span className="text-[11px] text-muted-foreground">Ollama VLM</span>
          </div>

          <button
            onClick={() => {
              void checkConnectivity();
              onRefresh?.();
            }}
            disabled={checking}
            className="ml-1 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            title="Refresh connectivity status"
          >
            <RefreshCw className={`h-3 w-3 ${checking ? "animate-spin text-primary" : ""}`} />
          </button>
        </div>

        {/* User Account / Signout */}
        {session?.user ? (
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 border border-border/40 rounded-md px-2.5 py-1 text-xs bg-muted/20">
              <User className="h-3.5 w-3.5 text-primary" />
              <span className="max-w-[130px] truncate text-foreground font-medium">
                {session.user.name || session.user.email}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs cursor-pointer hover:bg-destructive/10 hover:text-destructive"
              onClick={() => void authClient.signOut()}
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
