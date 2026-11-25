import { useEffect, useState } from "react";
import {
  Images,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CompareSlider } from "@/components/compare/CompareSlider";
import { api, type Product, type AugmentationResult } from "@/lib/api";

interface AugmentationGalleryViewProps {
  initialProductId?: string;
}

export function AugmentationGalleryView({ initialProductId }: AugmentationGalleryViewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId || "");
  const [compareData, setCompareData] = useState<{
    originalImage: { path: string; maskPath?: string };
    variants: AugmentationResult[];
  } | null>(null);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState<string>("");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.getProducts();
        setProducts(res.products || []);
        if (!selectedProductId && res.products && res.products.length > 0) {
          setSelectedProductId(res.products[0].id);
        }
      } catch (err) {
        console.error("Failed to load products for gallery:", err);
      }
    };
    void fetchProducts();
  }, [selectedProductId]);

  useEffect(() => {
    if (initialProductId) {
      setSelectedProductId(initialProductId);
    }
  }, [initialProductId]);

  const loadCompareData = async (productId: string) => {
    if (!productId) return;
    setLoading(true);
    setReviewSuccess("");
    try {
      const res = await api.getCompare(productId);
      setCompareData({
        originalImage: res.originalImage,
        variants: res.variants || [],
      });
      setSelectedVariantIndex(0);
    } catch (err) {
      console.error("Failed to load comparison data:", err);
      setCompareData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProductId) {
      void loadCompareData(selectedProductId);
    }
  }, [selectedProductId]);

  const handleReview = async (decision: "APPROVE" | "REJECT" | "NEEDS_REVIEW") => {
    if (!currentVariant) return;
    setSubmittingReview(true);
    setReviewSuccess("");
    try {
      await api.reviewVariant(currentVariant.id, decision, "");
      setReviewSuccess(`Variant marked as ${decision}`);
      // Refresh comparison data
      await loadCompareData(selectedProductId);
    } catch (err: any) {
      alert(err.message || "Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const currentVariant =
    compareData && compareData.variants.length > selectedVariantIndex
      ? compareData.variants[selectedVariantIndex]
      : null;

  const originalUrl = selectedProductId
    ? `/api/products/${selectedProductId}/preview`
    : "/images/commercial.jpg";

  const variantUrl = currentVariant
    ? `/api/augmentations/results/${currentVariant.id}/image`
    : "/images/lifestyle.jpg";

  return (
    <div className="h-[calc(100vh-4.5rem)] max-h-[calc(100vh-4.5rem)] overflow-hidden flex flex-col gap-3 px-6 py-4 max-w-[1760px] mx-auto animate-in fade-in duration-300">
      {/* Top Header & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground leading-tight">
              Augmentation Gallery
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Interactive Before/After comparison &amp; human audit approval
            </p>
          </div>
          {currentVariant && (
            <Badge
              variant="outline"
              className={`text-[10px] font-semibold shrink-0 ${
                currentVariant.reviewDecision === "APPROVED"
                  ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                  : currentVariant.reviewDecision === "REJECTED"
                  ? "border-destructive/40 text-destructive bg-destructive/10"
                  : "border-amber-500/40 text-amber-400 bg-amber-500/10"
              }`}
            >
              {currentVariant.reviewDecision}
            </Badge>
          )}
          {reviewSuccess && (
            <span className="text-[11px] font-medium text-emerald-400 animate-in fade-in">
              · {reviewSuccess}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="max-w-[280px] rounded-md border border-border/70 bg-[#14171d] px-3 py-1.5 text-xs text-foreground focus:outline-hidden focus:border-primary"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.sku ? `(${p.sku})` : ""}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadCompareData(selectedProductId)}
            disabled={loading}
            className="text-xs h-8 px-2.5 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>

          {currentVariant && (
            <>
              <div className="h-5 w-px bg-border/60 mx-0.5 hidden sm:block" />
              <Button
                onClick={() => handleReview("APPROVE")}
                disabled={submittingReview}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 px-2.5 cursor-pointer"
              >
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                Approve
              </Button>
              <Button
                onClick={() => handleReview("NEEDS_REVIEW")}
                disabled={submittingReview}
                size="sm"
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs h-8 px-2.5 cursor-pointer"
              >
                <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                Flag
              </Button>
              <Button
                onClick={() => handleReview("REJECT")}
                disabled={submittingReview}
                size="sm"
                className="bg-destructive hover:bg-destructive/90 text-white text-xs h-8 px-2.5 cursor-pointer"
              >
                <XCircle className="mr-1 h-3.5 w-3.5" />
                Reject
              </Button>
              <a
                href={`/api/augmentations/results/${currentVariant.id}/image`}
                download={`variant-${currentVariant.id.slice(0, 8)}.png`}
                className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-[#12151b] px-2.5 h-8 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-primary" />
                PNG
              </a>
            </>
          )}
        </div>
      </div>

      {/* Main Single-Screen Canvas */}
      {loading ? (
        <div className="flex-1 min-h-0 rounded-xl border border-border/40 bg-card/40 animate-pulse flex items-center justify-center">
          <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin" />
        </div>
      ) : !compareData || compareData.variants.length === 0 ? (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-10 text-center rounded-xl border border-dashed border-border/60 bg-[#0c0e12]/60">
          <Images className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="text-sm font-semibold text-foreground">No Augmentation Variants Found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {selectedProduct?.name
              ? `There are no generated variants yet for ${selectedProduct.name}. Head to the Augmentation Studio to generate synthetic versions.`
              : "Select a product from the dropdown above to view its variants."}
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col gap-3 rounded-xl border border-border/70 bg-[#0c0e12] p-3">
          {/* Compare Slider fitted inside remaining viewport height */}
          <div className="flex-1 min-h-0 flex items-center justify-center">
            <div className="relative h-full max-h-full aspect-4/3 max-w-full rounded-lg overflow-hidden border border-border/60 bg-[#15191f]">
              <CompareSlider
                before={originalUrl}
                after={variantUrl}
                beforeAlt="Original Studio Product"
                afterAlt="Augmented Synthetic Variant"
                className="h-full w-full"
              />
            </div>
          </div>

          {/* Compact Bottom Variant Selector Strip */}
          <div className="shrink-0 flex items-center justify-between gap-3 pt-1 border-t border-border/40">
            <div className="flex items-center gap-2.5 overflow-x-auto py-0.5">
              {compareData.variants.map((v, idx) => {
                const isSelected = idx === selectedVariantIndex;
                return (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariantIndex(idx)}
                    className={`relative h-12 w-12 flex-shrink-0 rounded-md overflow-hidden border transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary ring-2 ring-primary/40"
                        : "border-border/60 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={`/api/augmentations/results/${v.id}/image`}
                      alt={`Variant ${idx + 1}`}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/images/lifestyle.jpg";
                      }}
                    />
                    <div className="absolute bottom-0.5 right-0.5 rounded bg-[#07080c]/85 px-1 text-[8px] font-mono text-muted-foreground">
                      {v.workflowId}
                    </div>
                  </button>
                );
              })}
            </div>

            {currentVariant && (
              <div className="hidden md:flex items-center gap-3 text-[11px] font-mono text-muted-foreground shrink-0">
                <span>
                  {selectedVariantIndex + 1} / {compareData.variants.length}
                </span>
                <span className="truncate max-w-[320px]" title={currentVariant.prompt || ""}>
                  {currentVariant.prompt || currentVariant.workflowId}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
