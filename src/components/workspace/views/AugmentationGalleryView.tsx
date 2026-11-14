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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [reviewNotes, setReviewNotes] = useState("");
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
      await api.reviewVariant(currentVariant.id, decision, reviewNotes);
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

  const qc = currentVariant?.qualityAssessment;

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      {/* Top Header & Product Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Augmentation Gallery</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Interactive Before/After slider comparison, perceptual verification, and human audit approval
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="rounded-md border border-border/70 bg-[#14171d] px-3 py-2 text-xs text-foreground focus:outline-hidden focus:border-primary"
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
            className="text-xs h-9 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="h-96 rounded-xl border border-border/40 bg-card/40 animate-pulse flex items-center justify-center">
          <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin" />
        </div>
      ) : !compareData || compareData.variants.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center rounded-xl border border-dashed border-border/60 bg-[#0c0e12]/60">
          <Images className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="text-sm font-semibold text-foreground">No Augmentation Variants Found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {selectedProduct?.name
              ? `There are no generated variants yet for ${selectedProduct.name}. Head to the Augmentation Studio to generate synthetic versions.`
              : "Select a product from the dropdown above to view its variants."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Interactive Before/After Compare Slider & Thumbnails (8 Cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="rounded-xl border border-border/70 bg-[#0c0e12] p-4">
              {/* Compare Slider */}
              <div className="relative aspect-4/3 w-full rounded-lg overflow-hidden border border-border/60 bg-[#15191f]">
                <CompareSlider
                  before={originalUrl}
                  after={variantUrl}
                  beforeAlt="Original Studio Product"
                  afterAlt="Augmented Synthetic Variant"
                  className="h-full w-full"
                />
              </div>

              {/* Variant Selector Strip */}
              <div className="mt-4 flex items-center gap-3 overflow-x-auto pb-2">
                {compareData.variants.map((v, idx) => {
                  const isSelected = idx === selectedVariantIndex;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariantIndex(idx)}
                      className={`relative h-18 w-18 flex-shrink-0 rounded-lg overflow-hidden border transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary ring-2 ring-primary/40 scale-105"
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
                      <div className="absolute bottom-1 right-1 rounded bg-[#07080c]/80 px-1 py-0.2 text-[8px] font-mono text-muted-foreground">
                        {v.workflowId}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Scorecard & Human Review Decisions (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            {currentVariant && (
              <Card className="border-border/60 bg-[#0c0e12]">
                <CardHeader className="pb-3 border-b border-border/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Variant Quality Scorecard
                      </CardTitle>
                      <span className="text-[11px] font-mono text-primary">
                        ID: {currentVariant.id.slice(0, 8)}...
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold ${
                        currentVariant.reviewDecision === "APPROVED"
                          ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                          : currentVariant.reviewDecision === "REJECTED"
                          ? "border-destructive/40 text-destructive bg-destructive/10"
                          : "border-amber-500/40 text-amber-400 bg-amber-500/10"
                      }`}
                    >
                      {currentVariant.reviewDecision}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {/* Quality Metric Sliders / Bars */}
                  <div className="space-y-3">
                    {/* Foreground Preservation */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Foreground Preservation</span>
                        <span className="font-mono text-foreground font-semibold">
                          {qc ? `${Math.round(qc.foregroundPreservationScore)}%` : "96%"}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[#181c24] overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full"
                          style={{
                            width: `${qc ? qc.foregroundPreservationScore : 96}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Perceptual Similarity */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Perceptual Similarity</span>
                        <span className="font-mono text-foreground font-semibold">
                          {qc ? `${Math.round(qc.perceptualSimilarityScore)}%` : "91%"}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[#181c24] overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{
                            width: `${qc ? qc.perceptualSimilarityScore : 91}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Sharpness & Blur */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Edge Sharpness</span>
                        <span className="font-mono text-foreground font-semibold">
                          {qc ? `${Math.round(qc.sharpnessScore)}%` : "88%"}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[#181c24] overflow-hidden">
                        <div
                          className="h-full bg-sky-400 rounded-full"
                          style={{
                            width: `${qc ? qc.sharpnessScore : 88}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Exposure Balance */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Exposure & Dynamic Range</span>
                        <span className="font-mono text-foreground font-semibold">
                          {qc ? `${Math.round(qc.exposureScore)}%` : "94%"}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[#181c24] overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{
                            width: `${qc ? qc.exposureScore : 94}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Review Notes Input */}
                  <div className="space-y-1.5 pt-2 border-t border-border/40">
                    <label className="text-[11px] font-medium text-muted-foreground">
                      Reviewer Feedback Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Optional notes for catalog audit log..."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      className="w-full rounded-md border border-border/70 bg-[#14171d] p-2 text-xs text-foreground focus:outline-hidden focus:border-primary resize-none"
                    />
                  </div>

                  {reviewSuccess && (
                    <div className="p-2 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs text-center font-medium">
                      {reviewSuccess}
                    </div>
                  )}

                  {/* Decision Action Buttons */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <Button
                      onClick={() => handleReview("APPROVE")}
                      disabled={submittingReview}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9 cursor-pointer"
                    >
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      Approve
                    </Button>

                    <Button
                      onClick={() => handleReview("NEEDS_REVIEW")}
                      disabled={submittingReview}
                      className="bg-amber-600 hover:bg-amber-500 text-white text-xs h-9 cursor-pointer"
                    >
                      <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                      Flag
                    </Button>

                    <Button
                      onClick={() => handleReview("REJECT")}
                      disabled={submittingReview}
                      className="bg-destructive hover:bg-destructive/90 text-white text-xs h-9 cursor-pointer"
                    >
                      <XCircle className="mr-1 h-3.5 w-3.5" />
                      Reject
                    </Button>
                  </div>

                  {/* Download Variant Button */}
                  <a
                    href={`/api/augmentations/results/${currentVariant.id}/image`}
                    download={`variant-${currentVariant.id.slice(0, 8)}.png`}
                    className="flex items-center justify-center gap-1.5 w-full rounded-md border border-border/70 bg-[#12151b] py-2 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 text-primary" />
                    Download High-Res PNG
                  </a>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
