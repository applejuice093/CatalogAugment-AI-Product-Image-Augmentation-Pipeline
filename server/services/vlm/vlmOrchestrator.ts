import { config } from "../../config/unifiedConfig.ts";
import {
  imageConsistencySchema,
  productAnalysisSchema,
} from "../../validators/vlm.schema.ts";
import { CloudVLMProvider } from "./providers/cloudProvider.ts";
import { OllamaVLMProvider } from "./providers/ollamaProvider.ts";
import type {
  IVLMProvider,
  ImageConsistencyOutput,
  ProductAnalysisOutput,
  VLMExecutionResult,
} from "./types.ts";

export class VLMOrchestrator {
  private providers: Map<string, IVLMProvider> = new Map();
  private defaultPreference: string;

  constructor(
    providers?: IVLMProvider[],
    defaultPreference: string = config.vlm.defaultProvider
  ) {
    this.defaultPreference = defaultPreference;

    if (providers && providers.length > 0) {
      for (const p of providers) {
        this.providers.set(p.name, p);
      }
    } else {
      this.providers.set("ollama", new OllamaVLMProvider());
      this.providers.set("cloud", new CloudVLMProvider());
    }
  }

  public registerProvider(provider: IVLMProvider): void {
    this.providers.set(provider.name, provider);
  }

  public getRegisteredProviders(): Array<{ name: string; modelName: string }> {
    return Array.from(this.providers.values()).map((p) => ({
      name: p.name,
      modelName: p.modelName,
    }));
  }

  /**
   * Discovers and selects the best active provider based on health and routing policy
   */
  public async resolveProvider(preferred?: string): Promise<IVLMProvider> {
    const target = preferred ?? this.defaultPreference;

    if (target !== "auto" && this.providers.has(target)) {
      const provider = this.providers.get(target)!;
      const isHealthy = await provider.checkHealth();
      if (isHealthy) return provider;
    }

    // Default route policy: try local (Ollama) first, fallback to cloud
    const local = this.providers.get("ollama");
    if (local && (await local.checkHealth())) {
      return local;
    }

    const cloud = this.providers.get("cloud");
    if (cloud) {
      return cloud;
    }

    // Ultimate fallback to first available
    return Array.from(this.providers.values())[0];
  }

  /**
   * Task A: Extract structured product intelligence from an original product photo
   */
  public async analyzeProduct(
    imageBuffer: Buffer,
    preferredProvider?: string,
    mimeType = "image/png"
  ): Promise<VLMExecutionResult<ProductAnalysisOutput>> {
    const startTime = Date.now();
    const provider = await this.resolveProvider(preferredProvider);

    try {
      const result = await provider.analyzeProduct(imageBuffer, mimeType);
      const validated = productAnalysisSchema.parse(result);
      const latencyMs = Date.now() - startTime;

      return {
        taskType: "PRODUCT_ANALYSIS",
        provider: provider.name,
        modelName: provider.modelName,
        promptVersion: "1.0.0",
        data: validated,
        latencyMs,
        confidence: validated.confidence,
      };
    } catch (err) {
      // Automatic fallback if preferred provider failed
      if (provider.name === "ollama" && this.providers.has("cloud")) {
        const fallback = this.providers.get("cloud")!;
        const fallbackResult = await fallback.analyzeProduct(imageBuffer, mimeType);
        const validated = productAnalysisSchema.parse(fallbackResult);
        const latencyMs = Date.now() - startTime;

        return {
          taskType: "PRODUCT_ANALYSIS",
          provider: `${fallback.name} (fallback)`,
          modelName: fallback.modelName,
          promptVersion: "1.0.0",
          data: validated,
          latencyMs,
          confidence: validated.confidence,
        };
      }
      throw err;
    }
  }

  /**
   * Task B: Compare original product image vs. augmented variant for identity preservation
   */
  public async compareConsistency(
    originalBuffer: Buffer,
    augmentedBuffer: Buffer,
    preferredProvider?: string,
    mimeType = "image/png"
  ): Promise<VLMExecutionResult<ImageConsistencyOutput>> {
    const startTime = Date.now();
    const provider = await this.resolveProvider(preferredProvider);

    try {
      const result = await provider.compareConsistency(
        originalBuffer,
        augmentedBuffer,
        mimeType
      );
      const validated = imageConsistencySchema.parse(result);
      const latencyMs = Date.now() - startTime;

      return {
        taskType: "IMAGE_CONSISTENCY",
        provider: provider.name,
        modelName: provider.modelName,
        promptVersion: "1.0.0",
        data: validated,
        latencyMs,
        isConsistent: validated.isSameProduct,
        confidence: validated.identityPreservationScore / 100,
      };
    } catch (err) {
      if (provider.name === "ollama" && this.providers.has("cloud")) {
        const fallback = this.providers.get("cloud")!;
        const fallbackResult = await fallback.compareConsistency(
          originalBuffer,
          augmentedBuffer,
          mimeType
        );
        const validated = imageConsistencySchema.parse(fallbackResult);
        const latencyMs = Date.now() - startTime;

        return {
          taskType: "IMAGE_CONSISTENCY",
          provider: `${fallback.name} (fallback)`,
          modelName: fallback.modelName,
          promptVersion: "1.0.0",
          data: validated,
          latencyMs,
          isConsistent: validated.isSameProduct,
          confidence: validated.identityPreservationScore / 100,
        };
      }
      throw err;
    }
  }
}

export const defaultVLMOrchestrator = new VLMOrchestrator();
