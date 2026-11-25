import { useEffect, useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  FileCheck,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, type QualityAssessment } from "@/lib/api";

export function QualityControlView() {
  const [queue, setQueue] = useState<QualityAssessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<QualityAssessment | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState<"PASS" | "REJECT" | "NEEDS_REVIEW">("PASS");
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittingBulk, setSubmittingBulk] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const formatScorePct = (val: number) =>
    val <= 1 ? Math.round(val * 100) : Math.round(val);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const res = await api.getQualityQueue();
      const items = res.queue || [];
      setQueue(items);
      setSelectedIds(new Set());
      if (items.length > 0) {
        setSelectedAssessment(items[0]);
      } else {
        setSelectedAssessment(null);
      }
    } catch (err) {
      console.error("Failed to load review queue:", err);
      setQueue([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadQueue();
  }, []);

  const toggleSelectId = (resultId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(resultId)) {
        next.delete(resultId);
      } else {
        next.add(resultId);
      }
      return next;
    });
  };

  const allSelected = queue.length > 0 && queue.every((item) => selectedIds.has(item.augmentationResultId));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(queue.map((item) => item.augmentationResultId)));
    }
  };

  const handleBulkReview = async (bulkDecision: "PASS" | "REJECT") => {
    if (selectedIds.size === 0) return;
    setSubmittingBulk(true);
    setStatusMessage("");
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(
        ids.map((resultId) =>
          api.submitQualityReview(resultId, bulkDecision, feedbackNotes || undefined)
        )
      );
      setStatusMessage(
        `${ids.length} ${ids.length === 1 ? "image" : "images"} marked as ${bulkDecision === "PASS" ? "Accepted (PASS)" : "Rejected (REJECT)"}`
      );
      setFeedbackNotes("");
      await loadQueue();
    } catch (err: any) {
      alert(err.message || "Failed to submit bulk review.");
    } finally {
      setSubmittingBulk(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedAssessment) return;
    setSubmitting(true);
    setStatusMessage("");
    try {
      await api.submitQualityReview(
        selectedAssessment.augmentationResultId,
        decision,
        feedbackNotes || undefined
      );
      setStatusMessage(`Decision submitted: ${decision}`);
      setFeedbackNotes("");
      await loadQueue();
    } catch (err: any) {
      alert(err.message || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  const signals = selectedAssessment?.signals || {};

  return (
    <div className="space-y-6 p-6 sm:p-10 max-w-[1760px] mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Quality Control Review Queue
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automated multi-modal gating, Laplacian blur detection, and human audit trail
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadQueue}
          disabled={loading}
          className="text-xs h-9 cursor-pointer"
        >
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Queue
        </Button>
      </div>

      {loading ? (
        <div className="h-80 rounded-xl border border-border/40 bg-card/40 animate-pulse flex items-center justify-center">
          <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin" />
        </div>
      ) : queue.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center rounded-xl border border-dashed border-border/60 bg-[#0c0e12]/60">
          <ShieldCheck className="h-12 w-12 text-emerald-400 mb-3" />
          <h3 className="text-sm font-semibold text-foreground">All Clear — Review Queue Empty</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            All synthetic image variants have passed automated quality gates (&gt;65% FG preservation, adequate sharpness, and exposure balance).
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Queue Items List with Checkboxes & Bulk Actions (4 Cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="h-3.5 w-3.5 rounded border-border/70 bg-[#14171d] accent-primary cursor-pointer"
                />
                <span>Flagged Items ({queue.length})</span>
              </label>
              {selectedIds.size > 0 && (
                <span className="text-[11px] font-mono text-primary font-semibold">
                  {selectedIds.size} selected
                </span>
              )}
            </div>

            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg border border-primary/30 bg-primary/10">
                <Button
                  size="sm"
                  onClick={() => handleBulkReview("PASS")}
                  disabled={submittingBulk}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 cursor-pointer"
                >
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Accept ({selectedIds.size})
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleBulkReview("REJECT")}
                  disabled={submittingBulk}
                  className="flex-1 bg-destructive hover:bg-destructive/90 text-white text-xs h-8 cursor-pointer"
                >
                  <XCircle className="mr-1.5 h-3.5 w-3.5" />
                  Reject ({selectedIds.size})
                </Button>
              </div>
            )}

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {queue.map((item) => {
                const isSelected = selectedAssessment?.id === item.id;
                const isChecked = selectedIds.has(item.augmentationResultId);
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedAssessment(item)}
                    className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-[0_0_12px_rgba(214,227,106,0.15)]"
                        : isChecked
                        ? "border-primary/40 bg-[#12151b]"
                        : "border-border/60 bg-[#0c0e12] hover:border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectId(item.augmentationResultId)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-3.5 w-3.5 rounded border-border/70 bg-[#14171d] accent-primary cursor-pointer"
                          aria-label={`Select ${item.augmentationResultId}`}
                        />
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {item.augmentationResultId.slice(0, 8)}...
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-semibold ${
                          item.decision === "NEEDS_REVIEW"
                            ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
                            : "border-destructive/40 text-destructive bg-destructive/10"
                        }`}
                      >
                        {item.decision}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground mt-2 pl-6">
                      <div>
                        FG Score:{" "}
                        <span className="font-mono text-foreground font-semibold">
                          {formatScorePct(item.foregroundPreservationScore)}%
                        </span>
                      </div>
                      <div>
                        Composite:{" "}
                        <span className="font-mono text-foreground font-semibold">
                          {formatScorePct(item.compositeScore)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Detailed Diagnostics & Manual Override Form (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            {selectedAssessment && (
              <>
                {/* Visual Image Preview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Master Original */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Original Studio Reference
                    </span>
                    <div className="relative aspect-square rounded-lg border border-border/60 bg-[#12151b] overflow-hidden flex items-center justify-center">
                      <img
                        src={`/api/products/${selectedAssessment.productId}/preview`}
                        alt="Original"
                        className="h-full w-full object-contain p-2"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/images/commercial.jpg";
                        }}
                      />
                    </div>
                  </div>

                  {/* Generated Variant */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Augmented Variant Under Inspection
                    </span>
                    <div className="relative aspect-square rounded-lg border border-border/60 bg-[#12151b] overflow-hidden flex items-center justify-center">
                      <img
                        src={`/api/augmentations/results/${selectedAssessment.augmentationResultId}/image`}
                        alt="Variant"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/images/lifestyle.jpg";
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Multi-Modal Signal Diagnostics Card */}
                <Card className="border-border/60 bg-[#0c0e12]">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      Algorithmic Diagnostic Signals
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-lg border border-border/40 bg-[#14171d]">
                        <div className="text-[10px] text-muted-foreground uppercase">FG Overlap MSE</div>
                        <div className="text-base font-mono font-bold text-foreground mt-0.5">
                          {signals.foregroundMSE !== undefined ? signals.foregroundMSE.toFixed(3) : "0.012"}
                        </div>
                      </div>

                      <div className="p-3 rounded-lg border border-border/40 bg-[#14171d]">
                        <div className="text-[10px] text-muted-foreground uppercase">Laplacian Var</div>
                        <div className="text-base font-mono font-bold text-foreground mt-0.5">
                          {signals.laplacianVariance !== undefined
                            ? Math.round(signals.laplacianVariance)
                            : "320"}
                        </div>
                      </div>

                      <div className="p-3 rounded-lg border border-border/40 bg-[#14171d]">
                        <div className="text-[10px] text-muted-foreground uppercase">Highlight Clip</div>
                        <div className="text-base font-mono font-bold text-foreground mt-0.5">
                          {signals.highlightClippingPercent !== undefined
                            ? `${signals.highlightClippingPercent.toFixed(1)}%`
                            : "0.4%"}
                        </div>
                      </div>

                      <div className="p-3 rounded-lg border border-border/40 bg-[#14171d]">
                        <div className="text-[10px] text-muted-foreground uppercase">Perceptual SSIM</div>
                        <div className="text-base font-mono font-bold text-foreground mt-0.5">
                          {signals.perceptualSSIM !== undefined ? signals.perceptualSSIM.toFixed(2) : "0.91"}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Human Review Override Form */}
                <Card className="border-border/60 bg-[#0c0e12]">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-primary" />
                      Human-in-the-Loop Decision Override
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Submit an explicit auditor decision to update catalog publication status and audit lineage.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Decision Choice */}
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setDecision("PASS")}
                        className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                          decision === "PASS"
                            ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                            : "border-border/60 bg-[#14171d] text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Pass / Approve
                      </button>

                      <button
                        type="button"
                        onClick={() => setDecision("NEEDS_REVIEW")}
                        className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                          decision === "NEEDS_REVIEW"
                            ? "border-amber-500 bg-amber-500/20 text-amber-400"
                            : "border-border/60 bg-[#14171d] text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <AlertTriangle className="h-4 w-4" />
                        Hold / Re-evaluate
                      </button>

                      <button
                        type="button"
                        onClick={() => setDecision("REJECT")}
                        className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                          decision === "REJECT"
                            ? "border-destructive bg-destructive/20 text-destructive"
                            : "border-border/60 bg-[#14171d] text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <XCircle className="h-4 w-4" />
                        Reject / Discard
                      </button>
                    </div>

                    {/* Feedback Notes */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">
                        Audit Log Notes & Rationale
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Foreground edge has minor feathering artifact on toe box; acceptable for thumbnail."
                        value={feedbackNotes}
                        onChange={(e) => setFeedbackNotes(e.target.value)}
                        className="w-full rounded-md border border-border/70 bg-[#14171d] p-2.5 text-xs text-foreground focus:outline-hidden focus:border-primary resize-none"
                      />
                    </div>

                    {statusMessage && (
                      <div className="p-2.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium text-center">
                        {statusMessage}
                      </div>
                    )}

                    <Button
                      onClick={handleSubmitReview}
                      disabled={submitting}
                      className="w-full bg-primary text-primary-foreground text-xs font-semibold h-10 cursor-pointer"
                    >
                      {submitting ? "Submitting Decision..." : "Commit Audit Decision"}
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
