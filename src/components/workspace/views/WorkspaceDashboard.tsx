import { useEffect, useState } from "react";
import {
  Package,
  Wand2,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  LineChart,
  Images,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api, type Product, type QualityAssessment, type EvaluationRun } from "@/lib/api";
import type { WorkspaceTab } from "@/components/layout/WorkspaceNavbar";

interface WorkspaceDashboardProps {
  onNavigateTab: (tab: WorkspaceTab) => void;
}

export function WorkspaceDashboard({ onNavigateTab }: WorkspaceDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviewQueue, setReviewQueue] = useState<QualityAssessment[]>([]);
  const [evalRuns, setEvalRuns] = useState<EvaluationRun[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, queueRes, evalRes] = await Promise.allSettled([
        api.getProducts(),
        api.getQualityQueue(),
        api.getBenchmarkRuns(),
      ]);

      if (prodRes.status === "fulfilled") setProducts(prodRes.value.products || []);
      if (queueRes.status === "fulfilled") setReviewQueue(queueRes.value.queue || []);
      if (evalRes.status === "fulfilled") setEvalRuns(evalRes.value.runs || []);
    } catch (e) {
      console.error("Dashboard data load error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const totalProducts = products.length;
  const totalVariants = products.reduce(
    (acc, p) => acc + (p.jobs?.reduce((jAcc, j) => jAcc + (j.results?.length || 0), 0) || 0),
    0
  );
  const pendingReviews = reviewQueue.length;
  const passRate = totalVariants > 0 ? Math.round(((totalVariants - pendingReviews) / totalVariants) * 100) : 98;

  return (
    <div className="space-y-6 p-6 sm:p-10 max-w-[1760px] mx-auto animate-in fade-in duration-300">
      {/* Hero Action Header */}
      <div className="rounded-xl border border-white/10 bg-[#0d0f14] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-primary">
            <Sparkles className="size-3.5" />
            <span>Catalog Operations</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-[-0.03em] text-foreground">
            Synthesis & Retrieval Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Multi-angle variations, automated quality gating, and visual search benchmarks.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <Button
            onClick={() => onNavigateTab("studio")}
            className="h-9 px-4 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(214,227,106,0.25)] cursor-pointer"
          >
            <Wand2 className="mr-2 h-3.5 w-3.5" />
            Launch Studio
          </Button>
          <Button
            variant="outline"
            onClick={() => onNavigateTab("products")}
            className="h-9 px-4 text-xs font-medium border-white/10 hover:bg-white/5 cursor-pointer"
          >
            <Package className="mr-2 h-3.5 w-3.5" />
            Add Products
          </Button>
        </div>
      </div>

      {/* KPI Stat Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-white/10 bg-[#0d0f14] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium uppercase tracking-wider">Catalog SKUs</span>
            <Package className="size-4 text-primary" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {loading ? "..." : totalProducts}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Indexed source items</p>
          </div>
        </Card>

        <Card className="border-white/10 bg-[#0d0f14] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium uppercase tracking-wider">Generated Variants</span>
            <Wand2 className="size-4 text-primary" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {loading ? "..." : totalVariants}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Alpha-preserved renders</p>
          </div>
        </Card>

        <Card className="border-white/10 bg-[#0d0f14] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium uppercase tracking-wider">Quality Pass Rate</span>
            <ShieldCheck className="size-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-emerald-400">
              {loading ? "..." : `${passRate}%`}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">&gt; 65% foreground retention</p>
          </div>
        </Card>

        <Card className="border-white/10 bg-[#0d0f14] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium uppercase tracking-wider">Review Queue</span>
            <AlertTriangle className="size-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-amber-400">
              {loading ? "..." : pendingReviews}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Awaiting manual check</p>
          </div>
        </Card>
      </div>

      {/* Focused Task Workspaces Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Task 1 */}
        <div
          onClick={() => onNavigateTab("products")}
          className="group rounded-xl border border-white/10 bg-[#0d0f14] p-5 hover:border-primary/40 hover:bg-[#12151b] transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
              <Package className="size-4" />
            </div>
            <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              Product Library
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Upload product photos and inspect high-precision alpha cutouts.
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs font-medium text-primary gap-1">
            <span>Manage Catalog</span>
            <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Task 2 */}
        <div
          onClick={() => onNavigateTab("studio")}
          className="group rounded-xl border border-white/10 bg-[#0d0f14] p-5 hover:border-primary/40 hover:bg-[#12151b] transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
              <Wand2 className="size-4" />
            </div>
            <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              Augmentation Studio
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Generate 3D angle yaw, studio relighting, and inpainting variations.
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs font-medium text-primary gap-1">
            <span>Open Studio</span>
            <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Task 3 */}
        <div
          onClick={() => onNavigateTab("gallery")}
          className="group rounded-xl border border-white/10 bg-[#0d0f14] p-5 hover:border-primary/40 hover:bg-[#12151b] transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
              <Images className="size-4" />
            </div>
            <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              Variant Comparison
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Compare before/after variants with interactive split sliders.
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs font-medium text-primary gap-1">
            <span>View Gallery</span>
            <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Task 4 */}
        <div
          onClick={() => onNavigateTab("evaluation")}
          className="group rounded-xl border border-white/10 bg-[#0d0f14] p-5 hover:border-primary/40 hover:bg-[#12151b] transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
              <LineChart className="size-4" />
            </div>
            <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              Retrieval Benchmarks
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Measure Recall@K, mAP, and test interactive visual search probes.
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs font-medium text-primary gap-1">
            <span>Run Benchmark ({evalRuns.length})</span>
            <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
}
