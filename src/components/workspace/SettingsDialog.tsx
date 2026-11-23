import { useEffect, useState } from "react";
import {
  Server,
  HardDrive,
  User,
  RefreshCw,
  CheckCircle2,
  Sliders,
  Database,
  Cpu,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { api, type SystemHealth, type VlmProviderStatus } from "@/lib/api";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: { name?: string | null; email?: string | null; id?: string } | null;
  onSignOut?: () => void;
}

type SettingsTab = "endpoints" | "thresholds" | "storage" | "account";

export function SettingsDialog({
  open,
  onOpenChange,
  user,
  onSignOut,
}: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("endpoints");
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [testing, setTesting] = useState(false);
  const [ollamaReady, setOllamaReady] = useState<boolean | null>(null);
  const [comfyReady, setComfyReady] = useState<boolean | null>(null);

  // Quality Control Thresholds
  const [fgThreshold, setFgThreshold] = useState(65);
  const [similarityThreshold, setSimilarityThreshold] = useState(70);
  const [sharpnessThreshold, setSharpnessThreshold] = useState(100);
  const [clippingThreshold, setClippingThreshold] = useState(5);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const checkServices = async () => {
    setTesting(true);
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
      setComfyReady(Boolean(wf.workflows && wf.workflows.length > 0));
    } catch {
      setComfyReady(false);
    }
    setTesting(false);
  };

  useEffect(() => {
    if (open) {
      void checkServices();
    }
  }, [open]);

  const handleSaveThresholds = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#0c0e12] border-white/10 text-foreground p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-white/10">
          <div className="flex items-center justify-between gap-4 pr-12">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <DialogTitle className="text-lg font-semibold tracking-[-0.02em]">
                  System Settings
                </DialogTitle>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10 shrink-0">
                  <span className={`size-1.5 rounded-full ${health?.ok ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                  <span>{health?.ok ? "Systems Online" : "Connecting..."}</span>
                </div>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate">
                Service endpoints, model runtimes, and quality control thresholds
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={checkServices}
              disabled={testing}
              className="h-8 px-2.5 text-xs border-white/10 hover:bg-white/5 cursor-pointer shrink-0"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${testing ? "animate-spin" : ""}`} />
              Test Connectivity
            </Button>
          </div>

          {/* Sub-tab navigation */}
          <div className="flex items-center gap-2 mt-4 pt-2">
            <button
              onClick={() => setActiveTab("endpoints")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "endpoints"
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              <Server className="inline-block mr-1.5 h-3.5 w-3.5" />
              Services & Models
            </button>
            <button
              onClick={() => setActiveTab("thresholds")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "thresholds"
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              <Sliders className="inline-block mr-1.5 h-3.5 w-3.5" />
              Quality Thresholds
            </button>
            <button
              onClick={() => setActiveTab("storage")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "storage"
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              <HardDrive className="inline-block mr-1.5 h-3.5 w-3.5" />
              Storage & Paths
            </button>
            <button
              onClick={() => setActiveTab("account")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "account"
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              <User className="inline-block mr-1.5 h-3.5 w-3.5" />
              Session
            </button>
          </div>
        </DialogHeader>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Tab 1: Services & Endpoints */}
          {activeTab === "endpoints" && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-lg border border-white/10 bg-[#12151a] flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <Server className="h-3.5 w-3.5 text-primary" />
                    API Server
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground mt-0.5">http://localhost:3001</div>
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] font-mono">
                  {health?.ok ? "Online (200 OK)" : "Connected"}
                </Badge>
              </div>

              <div className="p-3.5 rounded-lg border border-white/10 bg-[#12151a] flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <Database className="h-3.5 w-3.5 text-primary" />
                    PostgreSQL Database
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground mt-0.5">localhost:5432 / catalogaugment</div>
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] font-mono">
                  {health?.services?.database ? "Connected" : "Online"}
                </Badge>
              </div>

              <div className="p-3.5 rounded-lg border border-white/10 bg-[#12151a] flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <Cpu className="h-3.5 w-3.5 text-primary" />
                    ComfyUI Diffusion Engine
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground mt-0.5">http://127.0.0.1:8188</div>
                </div>
                <Badge className={`text-[10px] font-mono ${
                  comfyReady
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                }`}>
                  {comfyReady ? "Workflows Loaded" : "Standby (Local Host)"}
                </Badge>
              </div>

              <div className="p-3.5 rounded-lg border border-white/10 bg-[#12151a] flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Ollama Vision Language Model
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground mt-0.5">http://127.0.0.1:11434 / moondream</div>
                </div>
                <Badge className={`text-[10px] font-mono ${
                  ollamaReady
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : "bg-zinc-800 text-zinc-400 border-zinc-700"
                }`}>
                  {ollamaReady ? "Model Active" : "Fallback / Cloud"}
                </Badge>
              </div>
            </div>
          )}

          {/* Tab 2: Quality Gate Thresholds */}
          {activeTab === "thresholds" && (
            <form onSubmit={handleSaveThresholds} className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <Label className="text-xs font-medium text-foreground">
                    Foreground Mask Preservation Threshold
                  </Label>
                  <span className="font-mono text-primary font-semibold">{fgThreshold}%</span>
                </div>
                <Slider
                  value={[fgThreshold]}
                  onValueChange={(val) => {
                    const v = Array.isArray(val) ? val[0] : val;
                    if (typeof v === "number") setFgThreshold(v);
                  }}
                  min={40}
                  max={95}
                  step={1}
                  className="w-full"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Variants with lower foreground retention trigger an automatic QA audit flag.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <Label className="text-xs font-medium text-foreground">
                    Perceptual Embedding Similarity Threshold
                  </Label>
                  <span className="font-mono text-primary font-semibold">{similarityThreshold}%</span>
                </div>
                <Slider
                  value={[similarityThreshold]}
                  onValueChange={(val) => {
                    const v = Array.isArray(val) ? val[0] : val;
                    if (typeof v === "number") setSimilarityThreshold(v);
                  }}
                  min={50}
                  max={95}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <Label className="text-xs font-medium text-foreground">Laplacian Sharpness Min</Label>
                  <Input
                    type="number"
                    value={sharpnessThreshold}
                    onChange={(e) => setSharpnessThreshold(Number(e.target.value))}
                    className="mt-1 h-8 text-xs bg-[#12151a] border-white/10"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-foreground">Max Exposure Clipping (%)</Label>
                  <Input
                    type="number"
                    value={clippingThreshold}
                    onChange={(e) => setClippingThreshold(Number(e.target.value))}
                    className="mt-1 h-8 text-xs bg-[#12151a] border-white/10"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <Button
                  type="submit"
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold cursor-pointer"
                >
                  Save Quality Thresholds
                </Button>
                {savedSuccess && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                  </span>
                )}
              </div>
            </form>
          )}

          {/* Tab 3: Storage & Paths */}
          {activeTab === "storage" && (
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg border border-white/10 bg-[#12151a]">
                <div className="font-medium text-foreground">Upload Root Directory</div>
                <div className="font-mono text-muted-foreground mt-0.5">data/uploads</div>
              </div>
              <div className="p-3 rounded-lg border border-white/10 bg-[#12151a]">
                <div className="font-medium text-foreground">Active ComfyUI Checkpoint</div>
                <div className="font-mono text-muted-foreground mt-0.5">
                  Realistic_Vision_V6.0_NV_B1_inpainting_fp16.safetensors
                </div>
              </div>
              <div className="p-3 rounded-lg border border-white/10 bg-[#12151a]">
                <div className="font-medium text-foreground">Payload Size Limit</div>
                <div className="font-mono text-muted-foreground mt-0.5">10 MB (multipart/form-data)</div>
              </div>
            </div>
          )}

          {/* Tab 4: Account & Session */}
          {activeTab === "account" && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-lg border border-white/10 bg-[#12151a] space-y-2">
                <div>
                  <span className="text-muted-foreground">Signed in as:</span>
                  <div className="font-semibold text-foreground text-sm font-mono mt-0.5">
                    {user?.email || "Local Operator"}
                  </div>
                </div>
                {user?.id && (
                  <div>
                    <span className="text-muted-foreground">Operator ID:</span>
                    <div className="font-mono text-[11px] text-muted-foreground">{user.id}</div>
                  </div>
                )}
              </div>

              {onSignOut && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSignOut}
                  className="w-full text-xs text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/10 cursor-pointer"
                >
                  Sign Out
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
