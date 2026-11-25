import { useEffect, useState, useRef, useMemo } from "react";
import {
  Wand2,
  Package,
  Layers,
  Sparkles,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Search,
  ChevronDown,
  Check,
  X,
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
    name: "Minimal Studio Pedestal",
    badge: "Clean E-Commerce",
    description: "Replaces background with an architectural white/light-gray concrete podium with soft studio shadows.",
    defaultPrompt: "clean minimal studio pedestal, white concrete podium table, soft commercial shadows, high key studio lighting, professional 8k product photography",
  },
  {
    id: "WF-02",
    name: "Dark Obsidian Luxury",
    badge: "Luxury Editorial",
    description: "Applies dramatic rim lighting, polished dark obsidian stone slab, and subtle floor reflections.",
    defaultPrompt: "luxury dark obsidian stone slab, dramatic golden rim lighting, moody subtle floor reflections, matte dark background, premium editorial product photography, 8k",
  },
  {
    id: "WF-03",
    name: "Urban Streetwear Asphalt",
    badge: "Outdoor Lifestyle",
    description: "Places product into an outdoor city street environment with natural sunlit asphalt and sidewalk textures.",
    defaultPrompt: "urban street asphalt pavement, natural outdoor daylight, textured city sidewalk, realistic ground shadow, modern streetwear lifestyle advertising, 8k sharp focus",
  },
  {
    id: "WF-04",
    name: "Warm Scandinavian Oak",
    badge: "Warm Interior",
    description: "Situates product on a natural oak wooden table with sun-drenched morning light and architectural shadows.",
    defaultPrompt: "warm natural oak wooden table, sun-drenched morning light, soft architectural window shadows, scandinavian minimalist interior, high detail, 8k",
  },
  {
    id: "WF-05",
    name: "Pastel Gradient Podium",
    badge: "Modern Commercial",
    description: "Modern high-key pastel studio with a circular display podium and diffused daylight.",
    defaultPrompt: "minimalist pastel studio, soft gradient background, circular display podium, diffused daylight, clean modern commercial",
  },
];

export function ImageStudioView({ initialProductId, onNavigateGallery }: ImageStudioViewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId || "");
  const [productQuery, setProductQuery] = useState<string>("");
  const [productDropdownOpen, setProductDropdownOpen] = useState<boolean>(false);
  const [hoveredWorkflowId, setHoveredWorkflowId] = useState<string | null>(null);
  const productComboboxRef = useRef<HTMLDivElement>(null);
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

  // Close product suggestion dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        productComboboxRef.current &&
        !productComboboxRef.current.contains(event.target as Node)
      ) {
        setProductDropdownOpen(false);
        setProductQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const sku = (p.sku || "").toLowerCase();
      const cat = (p.category || "").toLowerCase();
      return name.includes(q) || sku.includes(q) || cat.includes(q);
    });
  }, [products, productQuery]);

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
        numVariants: batchSize,
        compositeForeground,
        preserveOriginalForeground: compositeForeground,
      });

      const job = res.job || (res as any);
      setActiveJob(job);

      // Start polling job status
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(async () => {
        try {
          const pollRes = await api.getJob(job.id);
          const currentJob = pollRes.job || (pollRes as any);
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
  const selectedWorkflow = WORKFLOW_PRESETS.find((w) => w.id === selectedWorkflowId);

  return (
    <div className="space-y-6 p-6 sm:p-8 lg:p-10 max-w-[1760px] mx-auto animate-in fade-in duration-300">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-white/[0.07]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-widest text-primary mb-2">
            <Sparkles className="h-3 w-3" />
            Generative Synthesis Studio
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Augmentation Studio
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Generate synthetic product environments via ComfyUI with high-fidelity foreground alpha compositing.
          </p>
        </div>

        <div className="flex items-center gap-2.5 text-[11px] font-mono text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#12151b] px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {products.length} Catalog SKUs
          </span>
          {selectedWorkflow && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-primary">
              {selectedWorkflow.id} · {selectedWorkflow.badge}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Studio 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Input Source & Parameters (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. Target Product Selector */}
          <Card
            className={`border-white/[0.08] bg-[#0c0e12]/95 shadow-[0_12px_40px_rgba(0,0,0,0.45)] overflow-visible relative ${
              productDropdownOpen ? "z-30" : "z-10"
            }`}
          >
            <CardHeader className="pb-3 pt-4 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[11px] font-mono font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-primary/15 text-primary text-[10px] font-bold">
                    01
                  </span>
                  <Package className="h-3.5 w-3.5 text-primary" />
                  Select Master Product
                </CardTitle>
                <span className="text-[10px] font-mono text-muted-foreground/80">
                  {products.length} available
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 px-5 pb-5">
              <div ref={productComboboxRef} className="relative">
                <div className="relative flex items-center">
                  <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    value={
                      productDropdownOpen
                        ? productQuery
                        : selectedProduct
                        ? `${selectedProduct.name}${selectedProduct.sku ? ` (${selectedProduct.sku})` : ""} — ${selectedProduct.category || "General"}`
                        : ""
                    }
                    placeholder={
                      selectedProduct
                        ? `Search ${products.length} products (current: ${selectedProduct.name})...`
                        : "Type product name, SKU, or category to search..."
                    }
                    onFocus={() => {
                      setProductDropdownOpen(true);
                      setProductQuery("");
                    }}
                    onChange={(e) => {
                      setProductQuery(e.target.value);
                      if (!productDropdownOpen) setProductDropdownOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setProductDropdownOpen(false);
                        setProductQuery("");
                      } else if (e.key === "Enter" && productDropdownOpen && filteredProducts.length > 0) {
                        e.preventDefault();
                        setSelectedProductId(filteredProducts[0].id);
                        setProductDropdownOpen(false);
                        setProductQuery("");
                      }
                    }}
                    className="w-full h-11 rounded-lg border border-white/10 bg-[#14171d] pl-10 pr-16 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:border-primary/70 focus:ring-1 focus:ring-primary/30 transition-all"
                  />
                  <div className="absolute right-2.5 flex items-center gap-1">
                    {productDropdownOpen && productQuery && (
                      <button
                        type="button"
                        onClick={() => setProductQuery("")}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 cursor-pointer"
                        aria-label="Clear search"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const next = !productDropdownOpen;
                        setProductDropdownOpen(next);
                        if (next) setProductQuery("");
                      }}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 cursor-pointer"
                      aria-label="Toggle product list"
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${productDropdownOpen ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                </div>

                {productDropdownOpen && (
                  <div className="absolute z-50 mt-2 w-full rounded-xl border border-white/15 bg-[#12151b] shadow-[0_24px_60px_rgba(0,0,0,0.9)] overflow-hidden">
                    <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/[0.07] bg-[#0c0e12] text-[11px] font-mono text-muted-foreground">
                      <span>
                        {filteredProducts.length} {filteredProducts.length === 1 ? "match" : "matches"} of {products.length}
                      </span>
                      <span>Type to filter · Enter to select</span>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto divide-y divide-white/[0.04]">
                      {filteredProducts.length === 0 ? (
                        <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                          No products matching &ldquo;{productQuery}&rdquo;
                        </div>
                      ) : (
                        filteredProducts.slice(0, 80).map((p) => {
                          const isSelected = p.id === selectedProductId;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setSelectedProductId(p.id);
                                setProductDropdownOpen(false);
                                setProductQuery("");
                              }}
                              className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                                isSelected
                                  ? "bg-primary/15 text-primary"
                                  : "text-foreground hover:bg-white/[0.04]"
                              }`}
                            >
                              <div className="h-9 w-9 rounded-md bg-[#1a1e26] border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                                <img
                                  src={`/api/products/${p.id}/preview`}
                                  alt=""
                                  loading="lazy"
                                  className="h-full w-full object-contain p-0.5"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                  }}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium truncate">{p.name}</div>
                                <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                                  {p.sku || "No SKU"} · {p.category || "General"}
                                </div>
                              </div>
                              {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                            </button>
                          );
                        })
                      )}
                      {filteredProducts.length > 80 && (
                        <div className="px-3.5 py-2 text-center text-[11px] font-mono text-muted-foreground bg-[#0c0e12]">
                          Showing first 80 matches — keep typing to narrow down
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Product Preview Card */}
              {selectedProduct && (
                <div className="flex items-center gap-4 p-3 rounded-xl border border-white/[0.06] bg-[#12151b]/90">
                  <div className="h-16 w-16 rounded-lg bg-[#1a1e26] border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
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
                    <div className="text-sm font-semibold text-foreground truncate">
                      {selectedProduct.name}
                    </div>
                    <div className="text-[11px] font-mono text-primary mt-0.5">
                      SKU: {selectedProduct.sku || "N/A"} · {selectedProduct.category || "Uncategorized"}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Alpha mask &amp; cutout ready
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Compact Workflow Selection with Hover Details */}
          <Card className="border-white/[0.08] bg-[#0c0e12]/95 shadow-[0_12px_40px_rgba(0,0,0,0.45)] overflow-visible relative z-20">
            <CardHeader className="pb-3 pt-4 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[11px] font-mono font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-primary/15 text-primary text-[10px] font-bold">
                    02
                  </span>
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  Augmentation Workflow
                </CardTitle>
                <span className="text-[10px] font-mono text-muted-foreground/70">
                  Hover a preset for details
                </span>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              <div className="flex flex-wrap gap-2">
                {WORKFLOW_PRESETS.map((wf) => {
                  const isSelected = selectedWorkflowId === wf.id;
                  const isHovered = hoveredWorkflowId === wf.id;
                  return (
                    <div
                      key={wf.id}
                      className="relative"
                      onMouseEnter={() => setHoveredWorkflowId(wf.id)}
                      onMouseLeave={() => setHoveredWorkflowId((prev) => (prev === wf.id ? null : prev))}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectWorkflow(wf.id)}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary/15 text-primary shadow-[0_0_14px_rgba(214,227,106,0.18)]"
                            : "border-white/10 bg-[#14171d] text-foreground/85 hover:border-white/25 hover:bg-[#1a1e26] hover:text-foreground"
                        }`}
                      >
                        <span className="font-mono text-[10px] font-bold text-primary">
                          {wf.id}
                        </span>
                        <span className="whitespace-nowrap">{wf.name}</span>
                      </button>

                      {/* Hover Detail Popover */}
                      {isHovered && (
                        <div className="pointer-events-none absolute left-0 bottom-full mb-2 z-50 w-72 rounded-xl border border-white/15 bg-[#12151b]/95 p-3 shadow-[0_16px_40px_rgba(0,0,0,0.85)] backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="font-mono text-[10px] font-bold text-primary">
                              {wf.id}
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-mono text-muted-foreground">
                              {wf.badge}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-foreground">{wf.name}</div>
                          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                            {wf.description}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {selectedWorkflow && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-[#12151b]/70 px-3 py-2 text-[11px] text-muted-foreground">
                  <span className="truncate">
                    <span className="font-mono text-primary font-semibold mr-1.5">{selectedWorkflow.id}:</span>
                    {selectedWorkflow.description}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. Prompt Engineering Controls */}
          <Card className="border-white/[0.08] bg-[#0c0e12]/95 shadow-[0_12px_40px_rgba(0,0,0,0.45)] relative z-10">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-[11px] font-mono font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-primary/15 text-primary text-[10px] font-bold">
                  03
                </span>
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Synthesis Prompts &amp; Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-5 pb-5">
              {/* Positive Prompt */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground/90">Positive Prompt</Label>
                <textarea
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#14171d] p-3 text-xs text-foreground focus:outline-hidden focus:border-primary/70 resize-none leading-relaxed transition-colors"
                />
              </div>

              {/* Negative Prompt */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground/90">Negative Prompt</Label>
                <textarea
                  rows={2}
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#14171d] p-3 text-xs text-foreground focus:outline-hidden focus:border-primary/70 resize-none leading-relaxed transition-colors"
                />
              </div>

              {/* Grid: Seed, Batch Size, Compositing Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                {/* Seed */}
                <div className="space-y-1.5 rounded-lg border border-white/[0.06] bg-[#12151b]/70 p-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-medium text-muted-foreground">Seed</Label>
                    <button
                      type="button"
                      onClick={() => setSeed(Math.floor(Math.random() * 1000000))}
                      className="text-[10px] font-mono text-primary hover:underline cursor-pointer"
                    >
                      Randomize
                    </button>
                  </div>
                  <Input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(Number(e.target.value))}
                    className="text-xs bg-[#0c0e12] border-white/10 font-mono h-8"
                  />
                </div>

                {/* Batch Size */}
                <div className="space-y-1.5 rounded-lg border border-white/[0.06] bg-[#12151b]/70 p-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-medium text-muted-foreground">Batch Size</Label>
                    <span className="text-[11px] font-mono text-primary font-bold">{batchSize}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={4}
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    className="w-full accent-primary cursor-pointer mt-2"
                  />
                </div>

                {/* FG Compositing Toggle */}
                <div className="space-y-1.5 rounded-lg border border-white/[0.06] bg-[#12151b]/70 p-2.5">
                  <Label className="text-[11px] font-medium text-muted-foreground">Compositing Gate</Label>
                  <button
                    type="button"
                    onClick={() => setCompositeForeground(!compositeForeground)}
                    className={`w-full flex items-center justify-center gap-1.5 rounded-md border h-8 text-xs font-medium cursor-pointer transition-colors ${
                      compositeForeground
                        ? "bg-primary/15 border-primary/40 text-primary"
                        : "bg-[#0c0e12] border-white/10 text-muted-foreground hover:text-foreground"
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
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold h-11 rounded-lg cursor-pointer shadow-[0_0_20px_rgba(214,227,106,0.25)] transition-all"
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

        {/* Right Column: Sticky Execution Progress & Generated Variants Preview (5 Cols) */}
        <div className="lg:col-span-5 lg:sticky lg:top-6">
          <Card className="border-white/[0.08] bg-[#0c0e12]/95 shadow-[0_12px_40px_rgba(0,0,0,0.45)] min-h-[540px] flex flex-col">
            <CardHeader className="pb-3 pt-4 px-5 border-b border-white/[0.07]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[11px] font-mono font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  Generation Output
                </CardTitle>
                {activeJob && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-mono ${
                      activeJob.status === "COMPLETED"
                        ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                        : activeJob.status === "PROCESSING"
                        ? "border-primary/40 text-primary bg-primary/10 animate-pulse"
                        : "border-white/10 text-muted-foreground"
                    }`}
                  >
                    {activeJob.status}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-5 flex-1 flex flex-col justify-center bg-[radial-gradient(circle_at_center,rgba(214,227,106,0.03)_0%,transparent_70%)]">
              {submitting ? (
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/30 shadow-[0_0_24px_rgba(214,227,106,0.15)]">
                    <RefreshCw className="h-7 w-7 text-primary animate-spin" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">ComfyUI Diffusion Running</h4>
                    <p className="text-xs text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
                      Executing node graph with <span className="font-mono text-primary">{selectedWorkflowId}</span> and applying foreground alpha compositing...
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

                  <div className="grid grid-cols-2 gap-3.5">
                    {generatedResults.map((r, idx) => (
                      <div
                        key={r.id || idx}
                        className="group relative aspect-square rounded-xl border border-white/10 bg-[#15191f] overflow-hidden shadow-md"
                      >
                        <img
                          src={`/api/augmentations/results/${r.id}/image`}
                          alt={`Variant ${idx + 1}`}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/images/lifestyle.jpg";
                          }}
                        />
                        <div className="absolute bottom-2 left-2 rounded-md bg-[#07080c]/85 border border-white/10 px-2 py-0.5 text-[10px] font-mono text-foreground/90 backdrop-blur-xs">
                          Variant {idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                  <div className="h-12 w-12 rounded-2xl border border-white/10 bg-[#14171d] flex items-center justify-center">
                    <Wand2 className="h-5 w-5 text-primary/70" />
                  </div>
                  <div className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                    Select a product, pick a compact workflow preset, and click{" "}
                    <span className="text-primary font-medium">Generate Variants</span> to synthesize images.
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
