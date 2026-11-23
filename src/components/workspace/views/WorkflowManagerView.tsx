import { useEffect, useState } from "react";
import {
  Cpu,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, type WorkflowItem } from "@/lib/api";

export function WorkflowManagerView() {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowItem | null>(null);
  const [loading, setLoading] = useState(true);

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const res = await api.getWorkflows();
      const list = res.workflows || [];
      setWorkflows(list);
      if (list.length > 0) {
        setSelectedWorkflow(list[0]);
      }
    } catch (err) {
      console.error("Failed to load workflows:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkflows();
  }, []);

  return (
    <div className="space-y-6 p-6 sm:p-10 max-w-[1760px] mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            ComfyUI Workflow Manager
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Registered diffusion pipelines, parameter defaults, and automated compositing DAG schemas
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadWorkflows}
          disabled={loading}
          className="text-xs h-9 cursor-pointer"
        >
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Workflows
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Workflow List (4 Cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
            Registered Pipelines
          </div>

          <div className="space-y-2">
            {workflows.map((wf) => {
              const isSelected = selectedWorkflow?.id === wf.id;
              return (
                <div
                  key={wf.id}
                  onClick={() => setSelectedWorkflow(wf)}
                  className={`p-4 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-[0_0_12px_rgba(214,227,106,0.15)]"
                      : "border-border/60 bg-[#0c0e12] hover:border-border"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono font-bold text-primary">{wf.id}</span>
                    <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-400">
                      v{wf.version}
                    </Badge>
                  </div>
                  <h4 className="text-xs font-semibold text-foreground">{wf.name}</h4>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                    {wf.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Workflow Schema & Parameters Inspector (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedWorkflow ? (
            <>
              {/* Overview Card */}
              <Card className="border-border/60 bg-[#0c0e12]">
                <CardHeader className="pb-3 border-b border-border/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-primary" />
                        {selectedWorkflow.name} ({selectedWorkflow.id})
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {selectedWorkflow.description}
                      </CardDescription>
                    </div>
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                      Active in ComfyUI
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {/* Execution Flow Steps */}
                  <div>
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                      Pipeline Execution DAG
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-2.5 rounded-lg border border-border/40 bg-[#12151b]">
                        <div className="text-[10px] font-mono text-primary mb-1">Step 1</div>
                        <div className="font-medium text-foreground">Asset Masking</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Inversion & Feather</div>
                      </div>

                      <div className="p-2.5 rounded-lg border border-border/40 bg-[#12151b]">
                        <div className="text-[10px] font-mono text-primary mb-1">Step 2</div>
                        <div className="font-medium text-foreground">ComfyUI Diffusion</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Prompt Inpainting</div>
                      </div>

                      <div className="p-2.5 rounded-lg border border-border/40 bg-[#12151b]">
                        <div className="text-[10px] font-mono text-primary mb-1">Step 3</div>
                        <div className="font-medium text-foreground">FG Compositing</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Subject Lock & Blend</div>
                      </div>

                      <div className="p-2.5 rounded-lg border border-border/40 bg-[#12151b]">
                        <div className="text-[10px] font-mono text-primary mb-1">Step 4</div>
                        <div className="font-medium text-foreground">QC Evaluation</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">MSE / SSIM / VLM</div>
                      </div>
                    </div>
                  </div>

                  {/* Default Hyperparameters */}
                  <div>
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                      Default Generation Hyperparameters
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-2.5 rounded-md border border-border/40 bg-[#14171d]">
                        <span className="text-[10px] text-muted-foreground block">CFG Scale</span>
                        <span className="text-xs font-mono font-bold text-foreground">
                          {selectedWorkflow.defaultParams?.cfg ?? 7.5}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-md border border-border/40 bg-[#14171d]">
                        <span className="text-[10px] text-muted-foreground block">Sampling Steps</span>
                        <span className="text-xs font-mono font-bold text-foreground">
                          {selectedWorkflow.defaultParams?.steps ?? 25}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-md border border-border/40 bg-[#14171d]">
                        <span className="text-[10px] text-muted-foreground block">Denoise Strength</span>
                        <span className="text-xs font-mono font-bold text-foreground">
                          {selectedWorkflow.defaultParams?.denoise ?? 0.85}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-md border border-border/40 bg-[#14171d]">
                        <span className="text-[10px] text-muted-foreground block">Sampler</span>
                        <span className="text-xs font-mono font-bold text-foreground">
                          {selectedWorkflow.defaultParams?.sampler ?? "euler_ancestral"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Schema JSON Viewer */}
                  <div>
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                      Workflow Config JSON
                    </span>
                    <pre className="rounded-lg border border-border/40 bg-[#07080c] p-3 text-[11px] font-mono text-muted-foreground overflow-x-auto max-h-48">
                      {JSON.stringify(
                        selectedWorkflow.inputSchema || selectedWorkflow.defaultParams || {},
                        null,
                        2
                      )}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-16 text-center rounded-xl border border-dashed border-border/60 bg-[#0c0e12]/60">
              <Cpu className="h-10 w-10 text-muted-foreground mb-3" />
              <div className="text-xs text-muted-foreground">Select a workflow to inspect its configuration.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
