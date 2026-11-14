import { config } from "../../../config/unifiedConfig.ts";
import {
  imageConsistencySchema,
  productAnalysisSchema,
} from "../../../validators/vlm.schema.ts";
import type {
  IVLMProvider,
  ImageConsistencyOutput,
  ProductAnalysisOutput,
} from "../types.ts";

export class OllamaVLMProvider implements IVLMProvider {
  public readonly name = "ollama";
  public readonly modelName: string;
  private baseUrl: string;

  constructor(
    modelName: string = config.vlm.ollamaModel,
    baseUrl: string = config.vlm.ollamaBaseUrl
  ) {
    this.modelName = modelName;
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) return false;
      const data = (await response.json()) as { models?: Array<{ name: string }> };
      const modelExists = data.models?.some((m) =>
        m.name.toLowerCase().startsWith(this.modelName.toLowerCase())
      );
      return Boolean(modelExists);
    } catch {
      return false;
    }
  }

  async analyzeProduct(
    imageBuffer: Buffer,
    _mimeType = "image/png"
  ): Promise<ProductAnalysisOutput> {
    const base64Image = imageBuffer.toString("base64");

    const prompt = `You are an expert retail e-commerce visual intelligence specialist.
Analyze this product photograph carefully. Rely strictly on observable visual features. Do NOT guess or invent brand names or unseen technical specs.

Respond ONLY with valid JSON matching this schema:
{
  "category": "string (main product category, e.g. Footwear, Apparel, Electronics)",
  "subcategory": "string (specific type, e.g. Running Shoes, Chronograph Watch)",
  "dominantColors": ["string", "string"],
  "identifiableMaterials": ["string", "string (e.g. mesh, brushed steel, full-grain leather, rubber)"],
  "distinctiveAttributes": ["string (e.g. lace-up, textured sole, reflective tab)"],
  "description": "string (concise commercial catalog summary based strictly on visible features)",
  "searchTags": ["string", "string", "string"],
  "uncertainAttributes": ["string (any feature that cannot be verified visually)"],
  "confidence": 0.90
}`;

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.modelName,
        prompt,
        images: [base64Image],
        stream: false,
        format: "json",
      }),
      signal: AbortSignal.timeout(config.vlm.timeoutMs),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`Ollama generation failed (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as { response?: string };
    const rawJson = this.cleanJsonResponse(data.response || "{}");
    const parsed = JSON.parse(rawJson);

    return productAnalysisSchema.parse(parsed);
  }

  async compareConsistency(
    originalBuffer: Buffer,
    augmentedBuffer: Buffer,
    _mimeType = "image/png"
  ): Promise<ImageConsistencyOutput> {
    const origBase64 = originalBuffer.toString("base64");
    const augBase64 = augmentedBuffer.toString("base64");

    const prompt = `You are a strict quality control auditor for AI product image augmentation.
Compare the two images:
- Image 1 is the original authentic product photo.
- Image 2 is the generated augmented variant.

Assess whether the core product identity, contours, textures, and key details were faithfully preserved, and detect any generative hallucinations or visual artifacts.

Respond ONLY with valid JSON:
{
  "isSameProduct": true,
  "identityPreservationScore": 92,
  "colorPreservation": "string (e.g. accurate, slight shift in saturation, preserved)",
  "shapePreservation": "string (e.g. exact contour preserved, minor edge distortion)",
  "designPreservation": "string (e.g. logo and stitching intact)",
  "visibleArtifacts": ["string (e.g. floating pixels, blurred edge, none)"],
  "reviewRecommendation": "APPROVED",
  "assessmentNotes": "string (concise justification of the score and recommendation)"
}`;

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.modelName,
        prompt,
        images: [origBase64, augBase64],
        stream: false,
        format: "json",
      }),
      signal: AbortSignal.timeout(config.vlm.timeoutMs),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`Ollama comparison failed (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as { response?: string };
    const rawJson = this.cleanJsonResponse(data.response || "{}");
    const parsed = JSON.parse(rawJson);

    return imageConsistencySchema.parse(parsed);
  }

  private cleanJsonResponse(text: string): string {
    const trimmed = text.trim();
    if (trimmed.startsWith("```json")) {
      return trimmed.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    }
    if (trimmed.startsWith("```")) {
      return trimmed.replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    }
    return trimmed;
  }
}
