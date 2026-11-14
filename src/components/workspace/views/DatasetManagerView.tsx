import { useEffect, useState } from "react";
import {
  Database,
  Plus,
  FileJson,
  FileSpreadsheet,
  Archive,
  Trash2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api, type Dataset } from "@/lib/api";

export function DatasetManagerView() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("ecommerce-catalog-v1");
  const [version, setVersion] = useState("1.0.0");
  const [description, setDescription] = useState("Curated train/val/test catalog split for visual retrieval");
  const [trainPercent, setTrainPercent] = useState(70);
  const [valPercent, setValPercent] = useState(15);
  const [testPercent, setTestPercent] = useState(15);
  const [seed, setSeed] = useState(42);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadDatasets = async () => {
    setLoading(true);
    try {
      const res = await api.getDatasets();
      setDatasets(res.datasets || []);
    } catch (err) {
      console.error("Failed to load datasets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDatasets();
  }, []);

  const handleTrainChange = (val: number) => {
    setTrainPercent(val);
    const rem = 100 - val;
    setValPercent(Math.floor(rem / 2));
    setTestPercent(rem - Math.floor(rem / 2));
  };

  const handleCreateDataset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Dataset name is required.");
      return;
    }
    if (trainPercent + valPercent + testPercent !== 100) {
      setError("Train, Val, and Test split percentages must sum exactly to 100%.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await api.createDataset({
        name: name.trim(),
        version: version.trim(),
        description: description.trim(),
        trainRatio: trainPercent / 100,
        valRatio: valPercent / 100,
        testRatio: testPercent / 100,
        seed,
      });

      setIsModalOpen(false);
      await loadDatasets();
    } catch (err: any) {
      setError(err.message || "Failed to create dataset split.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDataset = async (id: string) => {
    if (!confirm("Are you sure you want to delete this dataset snapshot?")) return;
    try {
      await api.deleteDataset(id);
      setDatasets((prev) => prev.filter((d) => d.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete dataset.");
    }
  };

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Dataset Management & Provenance
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Mathematical SKU-level anti-leakage splitting, versioned manifests, and streaming ZIP export
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDatasets}
            disabled={loading}
            className="text-xs h-9 cursor-pointer"
          >
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            onClick={() => setIsModalOpen(true)}
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-9 cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Dataset Split
          </Button>
        </div>
      </div>

      {/* Anti-Leakage Mathematical Invariant Banner */}
      <div className="rounded-xl border border-primary/30 bg-[#0c0e12] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-foreground flex items-center gap-2">
              SKU-Level Anti-Leakage Partitioning Guarantee
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px]">
                Mathematically Verified
              </Badge>
            </div>
            <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
              S_train ∩ S_val = ∅ &nbsp;|&nbsp; S_train ∩ S_test = ∅ &nbsp;|&nbsp; S_val ∩ S_test = ∅
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
          Synthetic variants are strictly quarantined alongside their source product SKU, preventing data leakage during downstream visual search fine-tuning.
        </p>
      </div>

      {/* Datasets List */}
      {loading ? (
        <div className="h-64 rounded-xl border border-border/40 bg-card/40 animate-pulse flex items-center justify-center">
          <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin" />
        </div>
      ) : datasets.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center rounded-xl border border-dashed border-border/60 bg-[#0c0e12]/60">
          <Database className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="text-sm font-semibold text-foreground">No Datasets Created Yet</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Create your first versioned catalog snapshot to export JSON/CSV manifests and streaming ZIP packages.
          </p>
          <Button
            onClick={() => setIsModalOpen(true)}
            size="sm"
            className="mt-4 bg-primary text-primary-foreground text-xs"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Create First Dataset
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {datasets.map((d) => {
            const split = d.splitConfig || { train: 0.7, val: 0.15, test: 0.15 };
            return (
              <Card key={d.id} className="border-border/60 bg-[#0c0e12] flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className="text-[10px] font-mono text-primary">
                      v{d.version}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <CardTitle className="text-sm font-bold text-foreground truncate">
                    {d.name}
                  </CardTitle>
                  <CardDescription className="text-xs line-clamp-2">
                    {d.description || "Versioned catalog export package"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-1">
                  {/* Split Distribution Bar */}
                  <div>
                    <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                      <span>Train: {Math.round(split.train * 100)}%</span>
                      <span>Val: {Math.round(split.val * 100)}%</span>
                      <span>Test: {Math.round(split.test * 100)}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#181c24] flex overflow-hidden">
                      <div
                        className="bg-emerald-400 h-full"
                        style={{ width: `${split.train * 100}%` }}
                        title="Train"
                      />
                      <div
                        className="bg-primary h-full"
                        style={{ width: `${split.val * 100}%` }}
                        title="Validation"
                      />
                      <div
                        className="bg-sky-400 h-full"
                        style={{ width: `${split.test * 100}%` }}
                        title="Test"
                      />
                    </div>
                  </div>

                  {/* Summary Counters */}
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-border/40 text-muted-foreground">
                    <span>
                      Products: <strong className="text-foreground">{d.totalProducts}</strong>
                    </span>
                    <span>
                      Images: <strong className="text-foreground">{d.totalImages}</strong>
                    </span>
                  </div>

                  {/* Action Download Buttons */}
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <a
                      href={`/api/datasets/${d.id}/manifest.json`}
                      download={`${d.name}-manifest.json`}
                      className="flex items-center justify-center gap-1 rounded border border-border/70 bg-[#14171d] py-1.5 text-[11px] font-medium text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
                      title="Download JSON Manifest"
                    >
                      <FileJson className="h-3 w-3 text-primary" />
                      JSON
                    </a>

                    <a
                      href={`/api/datasets/${d.id}/manifest.csv`}
                      download={`${d.name}-manifest.csv`}
                      className="flex items-center justify-center gap-1 rounded border border-border/70 bg-[#14171d] py-1.5 text-[11px] font-medium text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
                      title="Download CSV Manifest"
                    >
                      <FileSpreadsheet className="h-3 w-3 text-emerald-400" />
                      CSV
                    </a>

                    <a
                      href={`/api/datasets/${d.id}/export.zip`}
                      download={`${d.name}.zip`}
                      className="flex items-center justify-center gap-1 rounded border border-border/70 bg-[#14171d] py-1.5 text-[11px] font-medium text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
                      title="Download Streaming ZIP Archive"
                    >
                      <Archive className="h-3 w-3 text-sky-400" />
                      ZIP
                    </a>
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteDataset(d.id)}
                      className="text-destructive hover:bg-destructive/10 text-[10px] h-6 px-2"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete Snapshot
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dataset Split Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-[#0e1115] border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Create Versioned Dataset Snapshot</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define partition ratios and freeze SKU-level catalog items into verifiable manifests.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateDataset} className="space-y-4 mt-2">
            {error && (
              <div className="p-2.5 rounded-md bg-destructive/15 border border-destructive/30 text-destructive text-xs">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="ds-name" className="text-xs font-medium">
                Dataset Name *
              </Label>
              <Input
                id="ds-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-xs bg-[#14171d] border-border/80"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ds-ver" className="text-xs font-medium">
                  Version
                </Label>
                <Input
                  id="ds-ver"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="text-xs bg-[#14171d] border-border/80 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ds-seed" className="text-xs font-medium">
                  Random Seed
                </Label>
                <Input
                  id="ds-seed"
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(Number(e.target.value))}
                  className="text-xs bg-[#14171d] border-border/80 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ds-desc" className="text-xs font-medium">
                Description
              </Label>
              <Input
                id="ds-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-xs bg-[#14171d] border-border/80"
              />
            </div>

            {/* Split Sliders */}
            <div className="space-y-3 pt-2 border-t border-border/40">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-foreground">Partition Split Ratios</span>
                <span className="font-mono text-primary font-bold">
                  {trainPercent}% / {valPercent}% / {testPercent}%
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Train Ratio</span>
                  <span>{trainPercent}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={90}
                  value={trainPercent}
                  onChange={(e) => handleTrainChange(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-primary text-primary-foreground text-xs"
              >
                {submitting ? "Partitioning..." : "Create Snapshot"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
