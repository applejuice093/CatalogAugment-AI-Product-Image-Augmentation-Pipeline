export interface ComfyPromptNode {
  inputs: Record<string, unknown>;
  class_type: string;
  _meta?: {
    title?: string;
  };
}

export type ComfyPromptGraph = Record<string, ComfyPromptNode>;

export interface ComfyQueuePromptRequest {
  client_id: string;
  prompt: ComfyPromptGraph;
  extra_data?: Record<string, unknown>;
}

export interface ComfyQueuePromptResponse {
  prompt_id: string;
  number: number;
  node_errors?: Record<string, unknown>;
}

export interface ComfyImageOutput {
  filename: string;
  subfolder: string;
  type: string;
}

export interface ComfyHistoryOutput {
  images?: ComfyImageOutput[];
  [key: string]: unknown;
}

export interface ComfyHistoryItem {
  prompt: [number, string, ComfyPromptGraph, Record<string, unknown>, string[]];
  outputs: Record<string, ComfyHistoryOutput>;
  status?: {
    status_str: string;
    completed: boolean;
    messages?: unknown[];
  };
}

export type ComfyHistoryResponse = Record<string, ComfyHistoryItem>;

export interface ComfySystemStats {
  system: {
    os: string;
    ram_total: number;
    ram_free: number;
    comfyui_version: string;
    python_version: string;
    pytorch_version: string;
  };
  devices: Array<{
    name: string;
    type: string;
    vram_total: number;
    vram_free: number;
  }>;
}

export type ComfyWsEventType =
  | "status"
  | "execution_start"
  | "executing"
  | "progress"
  | "executed"
  | "execution_error"
  | "execution_cached";

export interface ComfyWsMessage {
  type: ComfyWsEventType;
  data: {
    prompt_id?: string;
    node?: string | null;
    value?: number;
    max?: number;
    output?: ComfyHistoryOutput;
    exception_message?: string;
    exception_type?: string;
    node_id?: string;
    node_type?: string;
    status?: {
      exec_info?: {
        queue_remaining?: number;
      };
    };
  };
}

export interface WorkflowParameterMapping {
  promptNodeId?: string;
  promptField?: string;
  negativePromptNodeId?: string;
  negativePromptField?: string;
  samplerNodeId?: string;
  seedField?: string;
  stepsField?: string;
  cfgField?: string;
  denoiseField?: string;
  samplerNameField?: string;
  imageInputNodeId?: string;
  imageInputField?: string;
  maskInputNodeId?: string;
  maskInputField?: string;
  checkpointNodeId?: string;
  checkpointField?: string;
  latentImageNodeId?: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  version: string;
  description: string;
  category: "background" | "lighting" | "lifestyle" | "custom";
  defaultCheckpoint: string;
  parameterMapping: WorkflowParameterMapping;
  defaultParameters: {
    prompt: string;
    negativePrompt?: string;
    steps: number;
    cfg: number;
    denoise: number;
    sampler: string;
    seed?: number;
    width?: number;
    height?: number;
  };
  promptTemplate: ComfyPromptGraph;
}

export interface AugmentationJobConfig {
  workflowId: string;
  workflowVersion?: string;
  prompt?: string;
  negativePrompt?: string;
  seed?: number;
  steps?: number;
  cfg?: number;
  denoise?: number;
  sampler?: string;
  width?: number;
  height?: number;
}

export interface AugmentationProgress {
  jobId: string;
  promptId: string;
  progressPercent: number;
  currentNode: string | null;
  statusText: string;
}

export interface GeneratedVariant {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  subfolder?: string;
  promptId: string;
}
