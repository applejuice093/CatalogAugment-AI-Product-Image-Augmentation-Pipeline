import { useEffect, useState, useRef } from "react";
import {
  Wand2,
  Package,
  Layers,
  Sparkles,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { api, type Product, type AugmentationJob, type AugmentationResult } from "@/lib/api";

interface ImageStudioViewProps {
  initialProductId?: string;
  onNavigateGallery?: (productId: string) => void;
}

const WORKFLOW_PRESETS = [
  {
    id: "WF-01",
    name: "Background Inpainting",
    badge: "Clean E-Commerce",
    description: "Replaces background surfaces with studio pedestals, clean gradient backdrops, or solid tones.",
    defaultPrompt: "High-end product photography on a smooth matte white pedestal, soft neutral background, diffuse studio lighting, 8k resolution, crisp commercial look",
  },
  {
    id: "WF-02",
    name: "Studio Relighting",
    badge: "Harmonization",
    description: "Applies directional key/rim lighting, soft ground contact shadows, and realistic ambient occlusion.",
    defaultPrompt: "Dramatic side studio lighting, sharp rim light highlight, subtle cast shadow on concrete floor, professional product advertisement shot",
  },
  {
    id: "WF-03",
    name: "Lifestyle Synthesis",
    badge: "Ambient Scene",
    description: "Places product into contextual lifestyle scenes (interiors, outdoor environments, workspaces).",
    defaultPrompt: "Product placed naturally in a modern sunlit minimalist living room with oak wood table and lush indoor plants in soft bokeh background",
  },
];

export function ImageStudioView({ initialProductId, onNavigateGallery }: ImageStudioViewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId || "");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("WF-01");
  const [prompt, setPrompt] = useState<string>(WORKFLOW_PRESETS[0].defaultPrompt);
  const [negativePrompt, setNegativePrompt] = useState<string>(
    "blurry, low quality, artifacts, distorted product branding, noisy edges, washed out colors"
  );
  const [batchSize, setBatchSize] = useState<number>(2);
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 1000000));
  const [compositeForeground, setCompositeForeground] = useState<boolean>(true);

  // Job execution state
  const [submitting, setSubmitting] = useState(false);
  const [activeJob, setActiveJob] = useState<AugmentationJob | null>(null);
  const [generatedResults, setGeneratedResults] = useState<AugmentationResult[]>([]);
  const [error, setError] = useState<string>("");

  const pollIntervalRef = useRef<any>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.getProducts();
        setProducts(res.products || []);
        if (!selectedProductId && res.products && res.products.length > 0) {
          setSelectedProductId(res.products[0].id);
        }
      } catch (err) {
        console.error("Failed to load products for studio:", err);
      }
    };
    void fetchProducts();
  }, [selectedProductId]);

  useEffect(() => {
    if (initialProductId) {
      setSelectedProductId(initialProductId);
    }
  }, [initialProductId]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleSelectWorkflow = (wfId: string) => {
    setSelectedWorkflowId(wfId);
    const preset = WORKFLOW_PRESETS.find((w) => w.id === wfId);
    if (preset) {
      setPrompt(preset.defaultPrompt);
    }
  };

  const handleGenerate = async () => {
    if (!selectedProductId) {
      setError("Please select a product first.");
      return;
    }

    setSubmitting(true);
    setError("");
    setGeneratedResults([]);

    try {
      const res = await api.submitJob({
        productId: selectedProductId,
        workflowId: selectedWorkflowId,
        prompt: prompt.trim(),
        negativePrompt: negativePrompt.trim(),
        seed,
        batchSize,
        compositeForeground,
      });

      const job = res.job;
      setActiveJob(job);

      // Start polling job status
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(async () => {
        try {
          const pollRes = await api.getJob(job.id);
          const currentJob = pollRes.job;
          setActiveJob(currentJob);

          if (currentJob.status === "COMPLETED") {
            clearInterval(pollIntervalRef.current);
            setSubmitting(false);
            setGeneratedResults(currentJob.results || []);
          } else if (currentJob.status === "FAILED" || currentJob.status === "CANCELLED") {
            clearInterval(pollIntervalRef.current);
            setSubmitting(false);
            setError(currentJob.errorMessage || `Job ${currentJob.status.toLowerCase()}`);
          }
        } catch {
          // ignore transient poll error
        }
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to submit augmentation job.");
      setSubmitting(false);
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">Augmentation Studio</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Generate synthetic product environments via ComfyUI with high-fidelity foreground alpha compositing
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Studio 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input Source & Parameters (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Target Product Selector */}
          <Card className="border-border/60 bg-[#0c0e12]">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                1. Select Master Product
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full rounded-md border border-border/70 bg-[#14171d] px-3 py-2 text-xs text-foreground focus:outline-hidden focus:border-primary"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.sku ? `(${p.sku})` : ""} - {p.category || "General"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Preview Card */}
              {selectedProduct && (
                <div className="flex items-center gap-4 p-3 rounded-lg border border-border/40 bg-[#12151b]">
                  <div className="h-16 w-16 rounded-md bg-[#1a1e26] border border-border/60 overflow-hidden flex items-center justify-center flex-shrink-0">
                    <img
                      src={`/api/products/${selectedProduct.id}/preview`}
                      alt={selectedProduct.name}
                      className="h-full w-full object-contain p-1"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/images/commercial.jpg";
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-foreground truncate">
                      {selectedProduct.name}
                    </div>
                    <div className="text-[11px] font-mono text-primary mt-0.5">
                      SKU: {selectedProduct.sku || "N/A"} · {selectedProduct.category || "Uncategorized"}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Alpha mask & cutout ready
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Workflow Selection */}
          <Card className="border-border/60 bg-[#0c0e12]">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                2. Choose Augmentation Workflow
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {WORKFLOW_PRESETS.map((wf) => {
                  const isSelected = selectedWorkflowId === wf.id;
                  return (
                    <div
                      key={wf.id}
                      onClick={() => handleSelectWorkflow(wf.id)}
                      className={`p-3.5 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-[0_0_12px_rgba(214,227,106,0.15)]"
                          : "border-border/60 bg-[#12151b] hover:border-border"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-mono font-bold text-primary">
                            {wf.id}
                          </span>
                          <span className="text-[9px] rounded bg-muted/60 px-1 py-0.2 text-muted-foreground">
                            {wf.badge}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-foreground">{wf.name}</h4>
                        <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
                          {wf.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 3. Prompt Engineering Controls */}
          <Card className="border-border/60 bg-[#0c0e12]">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                3. Synthesis Prompts & Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Positive Prompt */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Positive Prompt</Label>
                <textarea
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full rounded-md border border-border/70 bg-[#14171d] p-2.5 text-xs text-foreground focus:outline-hidden focus:border-primary resize-none leading-relaxed"
                />
              </div>

              {/* Negative Prompt */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Negative Prompt</Label>
                <textarea
                  rows={2}
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  className="w-full rounded-md border border-border/70 bg-[#14171d] p-2.5 text-xs text-foreground focus:outline-hidden focus:border-primary resize-none leading-relaxed"
                />
              </div>

              {/* Grid: Seed, Batch Size, Compositing Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                {/* Seed */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-medium">Seed</Label>
                    <button
                      type="button"
                      onClick={() => setSeed(Math.floor(Math.random() * 1000000))}
                      className="text-[10px] text-primary hover:underline cursor-pointer"
                    >
                      Randomize
                    </button>
                  </div>
                  <Input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(Number(e.target.value))}
                    className="text-xs bg-[#14171d] border-border/70 font-mono h-8"
                  />
                </div>

                {/* Batch Size */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-medium">Batch Size</Label>
                    <span className="text-[11px] font-mono text-primary font-bold">{batchSize}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={4}
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    className="w-full accent-primary cursor-pointer mt-1"
                  />
                </div>

                {/* FG Compositing Toggle */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium">Compositing Gate</Label>
                  <button
                    type="button"
                    onClick={() => setCompositeForeground(!compositeForeground)}
                    className={`w-full flex items-center justify-center gap-1.5 rounded-md border h-8 text-xs font-medium cursor-pointer transition-colors ${
                      compositeForeground
                        ? "bg-primary/20 border-primary/40 text-primary"
                        : "bg-[#14171d] border-border/70 text-muted-foreground"
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>{compositeForeground ? "Alpha Feathers" : "Raw Model"}</span>
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleGenerate}
                disabled={submitting || !selectedProductId}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold h-10 cursor-pointer shadow-[0_0_16px_rgba(214,227,106,0.25)] mt-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating in ComfyUI...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate {batchSize} {batchSize === 1 ? "Variant" : "Variants"}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Execution Progress & Generated Variants Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-border/60 bg-[#0c0e12] h-full flex flex-col">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Generation Output
                </CardTitle>
                {activeJob && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-mono ${
                      activeJob.status === "COMPLETED"
                        ? "border-emerald-500/40 text-emerald-400"
                        : activeJob.status === "PROCESSING"
                        ? "border-primary/40 text-primary animate-pulse"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {activeJob.status}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 flex-1 flex flex-col justify-center">
              {submitting ? (
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 border border-primary/30">
                    <RefreshCw className="h-6 w-6 text-primary animate-spin" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">ComfyUI Diffusion Running</h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                      Executing node graph with {selectedWorkflowId} and applying foreground alpha compositing...
                    </p>
                  </div>
                </div>
              ) : generatedResults.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">
                      {generatedResults.length} Variants Generated
                    </span>
                    {selectedProduct && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onNavigateGallery?.(selectedProduct.id)}
                        className="text-xs text-primary hover:text-primary hover:bg-primary/10 h-7"
                      >
                        Inspect in Gallery
                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {generatedResults.map((r, idx) => (
                      <div
                        key={r.id || idx}
                        className="group relative aspect-square rounded-lg border border-border/70 bg-[#15191f] overflow-hidden"
                      >
                        <img
                          src={`/api/augmentations/results/${r.id}/image`}
                          alt={`Variant ${idx + 1}`}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/images/lifestyle.jpg";
                          }}
                        />
                        <div className="absolute bottom-1.5 left-1.5 rounded bg-[#07080c]/80 border border-border/50 px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground">
                          Variant {idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                  <Wand2 className="h-10 w-10 text-muted-foreground/60" />
                  <div className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                    Select a product, configure your preferred workflow and prompt, then click{" "}
                    <span className="text-primary font-medium">Generate Variants</span> to run ComfyUI.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
