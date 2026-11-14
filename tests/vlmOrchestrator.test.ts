import { describe, expect, it, vi } from "vitest";
import { VLMOrchestrator } from "../server/services/vlm/vlmOrchestrator.ts";
import type {
  IVLMProvider,
  ProductAnalysisOutput,
  ImageConsistencyOutput,
} from "../server/services/vlm/types.ts";

describe("VLMOrchestrator Unit Tests", () => {
  const mockProductAnalysis: ProductAnalysisOutput = {
    category: "Footwear",
    subcategory: "Athletic Running Shoes",
    dominantColors: ["#000000", "#FFFFFF"],
    identifiableMaterials: ["Synthetic Mesh", "Rubber"],
    distinctiveAttributes: ["Reflective heel tab", "Engineered mesh upper"],
    description: "Lightweight running shoes built for endurance.",
    searchTags: ["running", "footwear", "sneakers", "athletic"],
    uncertainAttributes: ["Water resistance unverified"],
    confidence: 0.95,
  };

  const mockConsistencyAssessment: ImageConsistencyOutput = {
    isSameProduct: true,
    identityPreservationScore: 92,
    colorPreservation: "Dominant black and white palette maintained with minimal shift.",
    shapePreservation: "Sole profile and silhouette matches original product.",
    designPreservation: "Logos and lace pattern remain faithful.",
    visibleArtifacts: [],
    reviewRecommendation: "APPROVED",
    assessmentNotes: "Excellent preservation of geometry and colorway.",
  };

  it("routes to primary provider when healthy and operational", async () => {
    const mockPrimary: IVLMProvider = {
      name: "ollama",
      modelName: "moondream",
      checkHealth: vi.fn().mockResolvedValue(true),
      analyzeProduct: vi.fn().mockResolvedValue(mockProductAnalysis),
      compareConsistency: vi.fn().mockResolvedValue(mockConsistencyAssessment),
    };

    const mockFallback: IVLMProvider = {
      name: "cloud",
      modelName: "gemini-1.5-flash",
      checkHealth: vi.fn().mockResolvedValue(true),
      analyzeProduct: vi.fn(),
      compareConsistency: vi.fn(),
    };

    const orchestrator = new VLMOrchestrator([mockPrimary, mockFallback], "ollama");

    const dummyBuffer = Buffer.from("dummy-image-data");
    const result = await orchestrator.analyzeProduct(dummyBuffer);

    expect(result.provider).toBe("ollama");
    expect(result.modelName).toBe("moondream");
    expect(result.taskType).toBe("PRODUCT_ANALYSIS");
    expect(result.data.category).toBe("Footwear");
    expect(result.confidence).toBe(0.95);
    expect(mockPrimary.analyzeProduct).toHaveBeenCalledTimes(1);
    expect(mockFallback.analyzeProduct).not.toHaveBeenCalled();
  });

  it("automatically falls back to cloud provider if ollama throws an error", async () => {
    const mockPrimary: IVLMProvider = {
      name: "ollama",
      modelName: "moondream",
      checkHealth: vi.fn().mockResolvedValue(true),
      analyzeProduct: vi.fn().mockRejectedValue(new Error("Ollama connection timed out")),
      compareConsistency: vi.fn(),
    };

    const mockFallback: IVLMProvider = {
      name: "cloud",
      modelName: "gemini-1.5-flash",
      checkHealth: vi.fn().mockResolvedValue(true),
      analyzeProduct: vi.fn().mockResolvedValue(mockProductAnalysis),
      compareConsistency: vi.fn(),
    };

    const orchestrator = new VLMOrchestrator([mockPrimary, mockFallback], "ollama");

    const dummyBuffer = Buffer.from("dummy-image-data");
    const result = await orchestrator.analyzeProduct(dummyBuffer);

    expect(result.provider).toContain("fallback");
    expect(result.modelName).toBe("gemini-1.5-flash");
    expect(result.data.category).toBe("Footwear");
    expect(mockFallback.analyzeProduct).toHaveBeenCalledTimes(1);
  });

  it("validates and scores augmentation consistency comparison correctly", async () => {
    const mockPrimary: IVLMProvider = {
      name: "ollama",
      modelName: "moondream",
      checkHealth: vi.fn().mockResolvedValue(true),
      analyzeProduct: vi.fn(),
      compareConsistency: vi.fn().mockResolvedValue(mockConsistencyAssessment),
    };

    const orchestrator = new VLMOrchestrator([mockPrimary], "ollama");

    const origBuffer = Buffer.from("original-bytes");
    const augBuffer = Buffer.from("augmented-bytes");
    const result = await orchestrator.compareConsistency(origBuffer, augBuffer);

    expect(result.provider).toBe("ollama");
    expect(result.taskType).toBe("IMAGE_CONSISTENCY");
    expect(result.data.identityPreservationScore).toBe(92);
    expect(result.data.reviewRecommendation).toBe("APPROVED");
    expect(result.isConsistent).toBe(true);
    expect(result.confidence).toBe(0.92);
  });

  it("falls back to cloud provider for compareConsistency when ollama fails", async () => {
    const mockPrimary: IVLMProvider = {
      name: "ollama",
      modelName: "moondream",
      checkHealth: vi.fn().mockResolvedValue(true),
      analyzeProduct: vi.fn(),
      compareConsistency: vi.fn().mockRejectedValue(new Error("Ollama OOM")),
    };

    const mockFallback: IVLMProvider = {
      name: "cloud",
      modelName: "gemini-1.5-flash",
      checkHealth: vi.fn().mockResolvedValue(true),
      analyzeProduct: vi.fn(),
      compareConsistency: vi.fn().mockResolvedValue(mockConsistencyAssessment),
    };

    const orchestrator = new VLMOrchestrator([mockPrimary, mockFallback], "ollama");

    const origBuffer = Buffer.from("original-bytes");
    const augBuffer = Buffer.from("augmented-bytes");
    const result = await orchestrator.compareConsistency(origBuffer, augBuffer);

    expect(result.provider).toContain("fallback");
    expect(result.modelName).toBe("gemini-1.5-flash");
    expect(result.data.identityPreservationScore).toBe(92);
  });

  it("reports registered providers correctly", () => {
    const mockPrimary: IVLMProvider = {
      name: "ollama",
      modelName: "moondream",
      checkHealth: vi.fn().mockResolvedValue(true),
      analyzeProduct: vi.fn(),
      compareConsistency: vi.fn(),
    };

    const mockFallback: IVLMProvider = {
      name: "cloud",
      modelName: "gemini-1.5-flash",
      checkHealth: vi.fn().mockResolvedValue(true),
      analyzeProduct: vi.fn(),
      compareConsistency: vi.fn(),
    };

    const orchestrator = new VLMOrchestrator([mockPrimary, mockFallback], "ollama");
    const registered = orchestrator.getRegisteredProviders();

    expect(registered).toEqual([
      { name: "ollama", modelName: "moondream" },
      { name: "cloud", modelName: "gemini-1.5-flash" },
    ]);
  });
});
