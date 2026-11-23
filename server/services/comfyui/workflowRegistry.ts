import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../../config/unifiedConfig.ts";
import type {
  AugmentationJobConfig,
  ComfyPromptGraph,
  WorkflowDefinition,
} from "./types.ts";

/**
 * Built-in WF-01: Background Replacement (Inpainting)
 * Targets background area while preserving product identity.
 */
export const WORKFLOW_WF01: WorkflowDefinition = {
  id: "wf-01-background-replacement",
  name: "WF-01 Background Replacement",
  version: "1.0.0",
  category: "background",
  description:
    "Inpaints background while preserving original product geometry and contours.",
  defaultCheckpoint: config.comfyui.checkpoint,
  parameterMapping: {
    checkpointNodeId: "1",
    checkpointField: "ckpt_name",
    imageInputNodeId: "2",
    imageInputField: "image",
    maskInputNodeId: "3",
    maskInputField: "image",
    promptNodeId: "5",
    promptField: "text",
    negativePromptNodeId: "6",
    negativePromptField: "text",
    samplerNodeId: "8",
    seedField: "seed",
    stepsField: "steps",
    cfgField: "cfg",
    denoiseField: "denoise",
    samplerNameField: "sampler_name",
  },
  defaultParameters: {
    prompt:
      "clean minimal e-commerce studio background, soft natural lighting, elegant pedestal, sharp focus, 8k commercial photography",
    negativePrompt:
      "distorted, disfigured, blurry, low quality, oversaturated, deformed, messy background",
    steps: 25,
    cfg: 7.0,
    denoise: 0.85,
    sampler: "euler",
    seed: 42,
  },
  recommendedConfig: {
    minDenoise: 0.7,
    maxDenoise: 0.95,
    recommendedDenoise: 0.85,
    recommendedSteps: 25,
    recommendedCfg: 7.0,
    recommendedSamplers: ["euler", "dpmpp_2m", "euler_ancestral"],
    presets: [
      {
        name: "Minimal Studio Pedestal",
        prompt:
          "clean minimal studio pedestal, white concrete table, soft commercial shadows, high key studio lighting, professional product photography",
        negativePrompt:
          "distorted, disfigured, blurry, low quality, messy background, oversaturated",
        denoise: 0.85,
        steps: 25,
        cfg: 7.0,
      },
      {
        name: "Dark Obsidian Luxury",
        prompt:
          "luxury dark obsidian stone slab, dramatic golden rim light, moody reflections, matte black background, premium editorial product photography, 8k",
        negativePrompt: "lowres, noisy, dust, fingerprints, deformed, overexposed, washed out",
        denoise: 0.88,
        steps: 25,
        cfg: 7.5,
      },
      {
        name: "Urban Streetwear Asphalt",
        prompt:
          "urban street asphalt pavement, natural outdoor daylight, textured city sidewalk, realistic ground shadow, modern streetwear lifestyle advertising, 8k sharp focus",
        negativePrompt: "studio, cartoon, painting, blurry, distorted, low quality",
        denoise: 0.88,
        steps: 25,
        cfg: 7.0,
      },
      {
        name: "Warm Scandinavian Oak",
        prompt:
          "warm natural oak wooden table, sun-drenched morning light, soft architectural window shadows, scandinavian minimalist interior, high detail, 8k",
        negativePrompt: "dark, gloomy, plastic, fake, blurry, low resolution, messy",
        denoise: 0.86,
        steps: 25,
        cfg: 7.0,
      },
      {
        name: "Pastel Gradient Podium",
        prompt:
          "minimalist pastel studio, soft gradient background, circular display podium, diffused daylight, clean modern commercial",
        negativePrompt: "harsh shadows, high grain, dirty surface, blurry",
        denoise: 0.82,
        steps: 25,
        cfg: 6.8,
      },
    ],
  },
  promptTemplate: {
    "1": {
      inputs: {
        ckpt_name: config.comfyui.checkpoint,
      },
      class_type: "CheckpointLoaderSimple",
      _meta: { title: "Load Checkpoint" },
    },
    "2": {
      inputs: {
        image: "product_input.png",
        upload: "image",
      },
      class_type: "LoadImage",
      _meta: { title: "Load Product Image" },
    },
    "3": {
      inputs: {
        image: "product_mask.png",
        channel: "red",
        upload: "image",
      },
      class_type: "LoadImageMask",
      _meta: { title: "Load Mask" },
    },
    "4": {
      inputs: {
        mask: ["3", 0],
      },
      class_type: "InvertMask",
      _meta: { title: "Invert Mask (Background Area)" },
    },
    "5": {
      inputs: {
        text: "clean minimal studio background, soft lighting",
        clip: ["1", 1],
      },
      class_type: "CLIPTextEncode",
      _meta: { title: "Positive Prompt" },
    },
    "6": {
      inputs: {
        text: "blurry, low quality, distorted",
        clip: ["1", 1],
      },
      class_type: "CLIPTextEncode",
      _meta: { title: "Negative Prompt" },
    },
    "7": {
      inputs: {
        pixels: ["2", 0],
        vae: ["1", 2],
        mask: ["4", 0],
        grow_mask_by: 6,
      },
      class_type: "VAEEncodeForInpaint",
      _meta: { title: "Encode For Inpaint" },
    },
    "8": {
      inputs: {
        seed: 42,
        steps: 25,
        cfg: 7.0,
        sampler_name: "euler",
        scheduler: "normal",
        denoise: 0.85,
        model: ["1", 0],
        positive: ["5", 0],
        negative: ["6", 0],
        latent_image: ["7", 0],
      },
      class_type: "KSampler",
      _meta: { title: "KSampler" },
    },
    "9": {
      inputs: {
        samples: ["8", 0],
        vae: ["1", 2],
      },
      class_type: "VAEDecode",
      _meta: { title: "VAE Decode" },
    },
    "10": {
      inputs: {
        filename_prefix: "CatalogAugment_WF01",
        images: ["9", 0],
      },
      class_type: "SaveImage",
      _meta: { title: "Save Generated Image" },
    },
  },
};

/**
 * Built-in WF-02: Lighting & Shadow Variation
 * Refines ambient highlights and directional shadows with subtle inpainting.
 */
export const WORKFLOW_WF02: WorkflowDefinition = {
  id: "wf-02-lighting-shadow",
  name: "WF-02 Lighting & Shadow Variation",
  version: "1.0.0",
  category: "lighting",
  description:
    "Adjusts directional studio lighting, rim lights, and contact shadows.",
  defaultCheckpoint: config.comfyui.checkpoint,
  parameterMapping: {
    checkpointNodeId: "1",
    checkpointField: "ckpt_name",
    imageInputNodeId: "2",
    imageInputField: "image",
    maskInputNodeId: "3",
    maskInputField: "image",
    promptNodeId: "5",
    promptField: "text",
    negativePromptNodeId: "6",
    negativePromptField: "text",
    samplerNodeId: "8",
    seedField: "seed",
    stepsField: "steps",
    cfgField: "cfg",
    denoiseField: "denoise",
    samplerNameField: "sampler_name",
  },
  defaultParameters: {
    prompt:
      "dramatic studio rim lighting, subtle soft contact shadows, warm golden hour ambient glow, commercial product photography",
    negativePrompt:
      "harsh specular blowout, muddy shadows, low quality, artifacts",
    steps: 28,
    cfg: 6.5,
    denoise: 0.65,
    sampler: "euler",
    seed: 101,
  },
  recommendedConfig: {
    minDenoise: 0.4,
    maxDenoise: 0.7,
    recommendedDenoise: 0.55,
    recommendedSteps: 28,
    recommendedCfg: 6.5,
    recommendedSamplers: ["euler", "dpmpp_2m"],
    presets: [
      {
        name: "Warm Golden Hour",
        prompt:
          "warm golden hour side light, gentle directional window sunbeam, soft organic shadow falloff, cinematic product illumination",
        negativePrompt: "harsh blowout, oversaturated, unnatural color cast, muddy shadows",
        denoise: 0.55,
        steps: 28,
        cfg: 6.5,
      },
      {
        name: "Dramatic Split Lighting",
        prompt:
          "dramatic studio split lighting, sharp contrast edge definition, subtle contact ground shadow, bold luxury lookbook aesthetic",
        negativePrompt: "pitch black crushed shadows, clipping, noisy dark areas",
        denoise: 0.6,
        steps: 30,
        cfg: 7.0,
      },
    ],
  },
  promptTemplate: {
    ...WORKFLOW_WF01.promptTemplate,
    "10": {
      inputs: {
        filename_prefix: "CatalogAugment_WF02",
        images: ["9", 0],
      },
      class_type: "SaveImage",
      _meta: { title: "Save Generated Image" },
    },
  },
};

/**
 * Built-in WF-03: Lifestyle Scene Placement
 * Places product into realistic contextual environments.
 */
export const WORKFLOW_WF03: WorkflowDefinition = {
  id: "wf-03-lifestyle-scene",
  name: "WF-03 Lifestyle Context Generation",
  version: "1.0.0",
  category: "lifestyle",
  description:
    "Composes product into realistic architectural and lifestyle environments.",
  defaultCheckpoint: config.comfyui.checkpoint,
  parameterMapping: { ...WORKFLOW_WF01.parameterMapping },
  defaultParameters: {
    prompt:
      "sunlit modern Scandinavian kitchen counter, marble surface, blurred cozy interior background, depth of field, architectural digest",
    negativePrompt:
      "unrealistic clutter, distorted geometry, noisy, low resolution",
    steps: 30,
    cfg: 7.5,
    denoise: 0.9,
    sampler: "euler",
    seed: 202,
  },
  recommendedConfig: {
    minDenoise: 0.8,
    maxDenoise: 0.95,
    recommendedDenoise: 0.88,
    recommendedSteps: 30,
    recommendedCfg: 7.5,
    recommendedSamplers: ["euler", "dpmpp_2m"],
    presets: [
      {
        name: "Scandinavian Living Table",
        prompt:
          "sunlit modern Scandinavian kitchen counter, marble surface, blurred cozy interior background, depth of field, architectural digest",
        negativePrompt: "unrealistic clutter, distorted geometry, noisy, low resolution",
        denoise: 0.88,
        steps: 30,
        cfg: 7.5,
      },
      {
        name: "Rustic Artisan Coffeehouse",
        prompt:
          "rustic artisan cafe tabletop, warm ambient bokeh, soft cafe interior background, lifestyle editorial magazine photography",
        negativePrompt: "deformed, blurry foreground, awkward perspective, bad lighting",
        denoise: 0.9,
        steps: 30,
        cfg: 7.2,
      },
      {
        name: "Sun-drenched Garden Terrace",
        prompt:
          "outdoor sun-drenched stone patio table, dappled foliage shadows, lush blurred greenery, bright morning sunshine",
        negativePrompt: "overexposed whites, chromatic aberration, low fidelity",
        denoise: 0.87,
        steps: 30,
        cfg: 7.0,
      },
    ],
  },
  promptTemplate: {
    ...WORKFLOW_WF01.promptTemplate,
    "10": {
      inputs: {
        filename_prefix: "CatalogAugment_WF03",
        images: ["9", 0],
      },
      class_type: "SaveImage",
      _meta: { title: "Save Generated Image" },
    },
  },
};

export class WorkflowRegistry {
  private workflows: Map<string, WorkflowDefinition> = new Map();

  constructor() {
    this.registerWorkflow(WORKFLOW_WF01);
    this.registerWorkflow(WORKFLOW_WF02);
    this.registerWorkflow(WORKFLOW_WF03);

    // Register convenience aliases for UI presets
    this.workflows.set("WF-01", WORKFLOW_WF01);
    this.workflows.set("wf-01", WORKFLOW_WF01);
    this.workflows.set("WF-02", WORKFLOW_WF02);
    this.workflows.set("wf-02", WORKFLOW_WF02);
    this.workflows.set("WF-03", WORKFLOW_WF03);
    this.workflows.set("wf-03", WORKFLOW_WF03);
    this.workflows.set("WF-04", WORKFLOW_WF01);
    this.workflows.set("wf-04", WORKFLOW_WF01);
    this.workflows.set("WF-05", WORKFLOW_WF01);
    this.workflows.set("wf-05", WORKFLOW_WF01);
  }

  public registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.id, workflow);
  }

  public getWorkflow(workflowId?: string): WorkflowDefinition {
    if (!workflowId) return WORKFLOW_WF01;
    const direct = this.workflows.get(workflowId);
    if (direct) return direct;

    const normalized = workflowId.trim().toLowerCase().replace(/[_\s]/g, "-");
    const normDirect = this.workflows.get(normalized);
    if (normDirect) return normDirect;

    for (const [key, wf] of this.workflows.entries()) {
      const lowerKey = key.toLowerCase();
      const lowerId = wf.id.toLowerCase();
      if (
        lowerKey === normalized ||
        lowerId === normalized ||
        lowerId.includes(normalized) ||
        normalized.includes(lowerKey) ||
        normalized.includes(lowerId)
      ) {
        return wf;
      }
    }

    return WORKFLOW_WF01;
  }

  public listWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Scans the external workflows folder specified in unifiedConfig
   * (e.g. C:\A\ComfyUI_windows_portable\ComfyUI\user\default\workflows)
   */
  public async loadExternalWorkflows(
    directoryPath: string = config.comfyui.workflowsPath
  ): Promise<number> {
    try {
      const entries = await fs.readdir(directoryPath, { withFileTypes: true });
      let loadedCount = 0;

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith(".json")) {
          const filePath = path.join(directoryPath, entry.name);
          try {
            const fileData = await fs.readFile(filePath, "utf8");
            const parsed = JSON.parse(fileData);

            // If it's a ComfyUI prompt graph or UI workflow
            const workflowId = `external-${path.basename(entry.name, ".json")}`;
            if (!this.workflows.has(workflowId)) {
              this.workflows.set(workflowId, {
                id: workflowId,
                name: `External: ${entry.name}`,
                version: "external",
                category: "custom",
                description: `Imported workflow from ${entry.name}`,
                defaultCheckpoint: config.comfyui.checkpoint,
                parameterMapping: { ...WORKFLOW_WF01.parameterMapping },
                defaultParameters: {
                  prompt: "product augmentation in scene",
                  negativePrompt: "low quality, blurry",
                  steps: 20,
                  cfg: 7.0,
                  denoise: 0.8,
                  sampler: "euler",
                },
                promptTemplate: parsed.nodes ? WORKFLOW_WF01.promptTemplate : parsed,
              });
              loadedCount++;
            }
          } catch (err) {
            console.warn(`[WorkflowRegistry] Skipped invalid workflow file ${entry.name}:`, err);
          }
        }
      }
      return loadedCount;
    } catch {
      // External folder might not exist or be accessible in non-local environments
      return 0;
    }
  }

  /**
   * Safe parameter injection into the workflow prompt template.
   * Ensures only approved parameters are modified, preventing arbitrary code or node injection.
   */
  public buildExecutablePrompt(
    workflow: WorkflowDefinition,
    jobConfig: AugmentationJobConfig,
    inputImageFilename: string,
    maskImageFilename?: string
  ): ComfyPromptGraph {
    // Deep clone prompt graph
    const executableGraph: ComfyPromptGraph = JSON.parse(
      JSON.stringify(workflow.promptTemplate)
    );
    const mapping = workflow.parameterMapping;

    // 1. Update Checkpoint if checkpointNodeId exists
    if (mapping.checkpointNodeId && executableGraph[mapping.checkpointNodeId]) {
      const node = executableGraph[mapping.checkpointNodeId];
      const field = mapping.checkpointField || "ckpt_name";
      node.inputs[field] = workflow.defaultCheckpoint || config.comfyui.checkpoint;
    }

    // 2. Update Image Input
    if (mapping.imageInputNodeId && executableGraph[mapping.imageInputNodeId]) {
      const node = executableGraph[mapping.imageInputNodeId];
      const field = mapping.imageInputField || "image";
      node.inputs[field] = inputImageFilename;
    }

    // 3. Update Mask Input
    if (
      maskImageFilename &&
      mapping.maskInputNodeId &&
      executableGraph[mapping.maskInputNodeId]
    ) {
      const node = executableGraph[mapping.maskInputNodeId];
      const field = mapping.maskInputField || "image";
      node.inputs[field] = maskImageFilename;
    }

    // 4. Update Positive Prompt
    if (mapping.promptNodeId && executableGraph[mapping.promptNodeId]) {
      const node = executableGraph[mapping.promptNodeId];
      const field = mapping.promptField || "text";
      node.inputs[field] =
        jobConfig.prompt?.trim() || workflow.defaultParameters.prompt;
    }

    // 5. Update Negative Prompt
    if (
      mapping.negativePromptNodeId &&
      executableGraph[mapping.negativePromptNodeId]
    ) {
      const node = executableGraph[mapping.negativePromptNodeId];
      const field = mapping.negativePromptField || "text";
      node.inputs[field] =
        jobConfig.negativePrompt?.trim() ||
        workflow.defaultParameters.negativePrompt ||
        "";
    }

    // 6. Update Sampler parameters
    if (mapping.samplerNodeId && executableGraph[mapping.samplerNodeId]) {
      const node = executableGraph[mapping.samplerNodeId];

      if (mapping.seedField) {
        node.inputs[mapping.seedField] =
          jobConfig.seed !== undefined
            ? jobConfig.seed
            : Math.floor(Math.random() * 1000000000);
      }

      if (mapping.stepsField) {
        const steps = jobConfig.steps ?? workflow.defaultParameters.steps;
        node.inputs[mapping.stepsField] = Math.max(1, Math.min(100, steps));
      }

      if (mapping.cfgField) {
        const cfg = jobConfig.cfg ?? workflow.defaultParameters.cfg;
        node.inputs[mapping.cfgField] = Math.max(1, Math.min(30, cfg));
      }

      if (mapping.denoiseField) {
        const denoise = jobConfig.denoise ?? workflow.defaultParameters.denoise;
        node.inputs[mapping.denoiseField] = Math.max(0.01, Math.min(1.0, denoise));
      }

      if (mapping.samplerNameField) {
        node.inputs[mapping.samplerNameField] =
          jobConfig.sampler ?? workflow.defaultParameters.sampler;
      }
    }

    return executableGraph;
  }
}

export const defaultWorkflowRegistry = new WorkflowRegistry();
