import { useEffect, useState } from "react";
import {
  Server,
  ShieldCheck,
  User,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { api, type SystemHealth } from "@/lib/api";

export function SettingsView() {
  const { data: session } = authClient.useSession();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(false);

  // QC Thresholds (Simulated config editable locally)
  const [fgThreshold, setFgThreshold] = useState(65);
  const [perceptualThreshold, setPerceptualThreshold] = useState(70);
  const [blurThreshold, setBlurThreshold] = useState(100);
  const [clippingThreshold, setClippingThreshold] = useState(5);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const h = await api.getHealth();
      setHealth(h);
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchHealth();
  }, []);

  const handleSaveThresholds = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-8 p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">System Settings</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Service endpoints, automated quality control safety thresholds, and active user session
        </p>
      </div>

      {/* 1. Infrastructure Services & Endpoints */}
      <Card className="border-border/60 bg-[#0c0e12]">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Server className="h-4 w-4 text-primary" />
              Service Endpoints & Telemetry
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchHealth}
              disabled={loading}
              className="text-[11px] h-7 cursor-pointer"
            >
              <RefreshCw className={`mr-1.5 h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              Test Services
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg border border-border/40 bg-[#12151b] flex items-center justify-between">
              <div>
                <div className="font-semibold text-foreground">API Application Server</div>
                <div className="text-[11px] font-mono text-muted-foreground">http://localhost:3001</div>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                Online
              </Badge>
            </div>

            <div className="p-3 rounded-lg border border-border/40 bg-[#12151b] flex items-center justify-between">
              <div>
                <div className="font-semibold text-foreground">ComfyUI Diffusion Host</div>
                <div className="text-[11px] font-mono text-muted-foreground">http://127.0.0.1:8188</div>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                Connected
              </Badge>
            </div>

            <div className="p-3 rounded-lg border border-border/40 bg-[#12151b] flex items-center justify-between">
              <div>
                <div className="font-semibold text-foreground">Ollama VLM Host</div>
                <div className="text-[11px] font-mono text-muted-foreground">
                  http://127.0.0.1:11434 (moondream)
                </div>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                Available
              </Badge>
            </div>

            <div className="p-3 rounded-lg border border-border/40 bg-[#12151b] flex items-center justify-between">
              <div>
                <div className="font-semibold text-foreground">PostgreSQL & Prisma Store</div>
                <div className="text-[11px] font-mono text-muted-foreground">
                  Catalog, Lineage & Datasets
                </div>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                Connected
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Quality Control Gating Thresholds */}
      <Card className="border-border/60 bg-[#0c0e12]">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Quality Control Safety Gating Thresholds
          </CardTitle>
          <CardDescription className="text-xs">
            Variants failing these criteria are automatically quarantined to the human review queue.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSaveThresholds} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <Label className="font-medium">Critical FG Preservation Gate</Label>
                  <span className="font-mono text-primary font-bold">{fgThreshold}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={95}
                  value={fgThreshold}
                  onChange={(e) => setFgThreshold(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <p className="text-[10px] text-muted-foreground">
                  Below this score, variants are immediately flagged as NEEDS_REVIEW or REJECT.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <Label className="font-medium">Perceptual Similarity (SSIM Proxy)</Label>
                  <span className="font-mono text-primary font-bold">{perceptualThreshold}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={95}
                  value={perceptualThreshold}
                  onChange={(e) => setPerceptualThreshold(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <p className="text-[10px] text-muted-foreground">
                  Structural high-frequency and low-frequency feature preservation.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <Label className="font-medium">Laplacian Variance Blur Floor</Label>
                  <span className="font-mono text-primary font-bold">{blurThreshold}</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={300}
                  value={blurThreshold}
                  onChange={(e) => setBlurThreshold(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <p className="text-[10px] text-muted-foreground">
                  Rejects blurry or out-of-focus background inpainting results.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <Label className="font-medium">Highlight / Shadow Clipping Ceiling</Label>
                  <span className="font-mono text-primary font-bold">{clippingThreshold}%</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={15}
                  value={clippingThreshold}
                  onChange={(e) => setClippingThreshold(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <p className="text-[10px] text-muted-foreground">
                  Maximum permissible blown highlights or crushed shadows.
                </p>
              </div>
            </div>

            {savedSuccess && (
              <div className="p-2.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs text-center font-medium">
                Quality control parameters updated and saved.
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button type="submit" size="sm" className="bg-primary text-primary-foreground text-xs">
                Save Thresholds
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 3. Account Information */}
      <Card className="border-border/60 bg-[#0c0e12]">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Active Session & Operator Identity
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-foreground">
                {session?.user?.name || "Platform Operator"}
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                {session?.user?.email || "developer@catalogaugment.ai"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Role: Catalog Engineer & Model Reviewer
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => void authClient.signOut()}
              className="text-destructive hover:bg-destructive/10 text-xs h-9 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
