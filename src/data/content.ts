export const navLinks = [
  { id: "platform", label: "Platform", href: "#platform" },
  { id: "technology", label: "Technology", href: "#technology" },
  { id: "workflow", label: "Workflow", href: "#workflow" },
  { id: "research", label: "Research", href: "#research" },
  { id: "about", label: "About", href: "#about" },
] as const;

export const challenges = [
  {
    title: "Lighting variation",
    copy: "A packshot lit for the studio falls apart under mixed shop lights, window glare, and uneven color.",
    image: "/images/problem-light.jpg",
    alt: "The same black and white running shoe under harsh mixed lighting",
  },
  {
    title: "Background variation",
    copy: "Catalog search meets warehouses, shelves, and clutter. The product is no longer the only thing in frame.",
    image: "/images/problem-background.jpg",
    alt: "The same running shoe photographed in a cluttered stock room",
  },
  {
    title: "Camera and perspective variation",
    copy: "Shoppers shoot from above, from the side, and too close. The silhouette changes even when the shoe does not.",
    image: "/images/problem-angle.jpg",
    alt: "The same running shoe photographed from a steep high angle",
  },
] as const;

export const stages = [
  {
    index: "01",
    title: "Upload",
    copy: "Product image ingestion. One photograph enters the pipeline and is stored with the account that sent it.",
    image: "/images/studio.jpg",
  },
  {
    index: "02",
    title: "Augment",
    copy: "ComfyUI and Stable Diffusion image generation. The same product is rendered into new light, places, and framing.",
    image: "/images/lifestyle.jpg",
  },
  {
    index: "03",
    title: "Understand",
    copy: "A vision-language model reads the product: category, color, material, and the attributes a search index needs.",
    image: "/images/commercial.jpg",
  },
  {
    index: "04",
    title: "Validate",
    copy: "Product consistency and quality assessment. The set is checked so the shoe in frame is still the shoe that was uploaded.",
    image: "/images/lowlight.jpg",
  },
] as const;

export const environments = [
  { id: "studio", label: "Studio", image: "/images/studio.jpg" },
  { id: "lifestyle", label: "Lifestyle", image: "/images/lifestyle.jpg" },
  { id: "outdoor", label: "Outdoor", image: "/images/outdoor.jpg" },
  { id: "lowlight", label: "Low-light", image: "/images/lowlight.jpg" },
  { id: "commercial", label: "Commercial photography", image: "/images/commercial.jpg" },
] as const;

export const attributes = [
  { label: "Category", value: "Footwear" },
  { label: "Colors", value: "Black / White" },
  { label: "Material", value: "Mesh / Rubber" },
  { label: "Attributes", value: "Lace-up, running shoe, textured sole" },
  { label: "Identity consistency", value: "Verified / Needs review" },
] as const;

export interface TechnologyItem {
  id: string;
  name: string;
  role: string;
  category: "client" | "ai" | "data";
  categoryLabel: string;
  href: string;
  responsibility: string;
  implemented: boolean;
  brandColor: string;
  glowColor: string;
  specs: { label: string; value: string }[];
  snippet?: string;
}

export const technologies: readonly TechnologyItem[] = [
  {
    id: "react",
    name: "React + TypeScript",
    role: "Reactive UI & 3D Canvas",
    category: "client",
    categoryLabel: "Client & Interface",
    href: "https://react.dev",
    responsibility:
      "This application frontend, studio upload workspace, and real-time WebGL interactive canvas. All client states, validation schemas, and API contracts are typed end to end.",
    implemented: true,
    brandColor: "#61DAFB",
    glowColor: "rgba(97, 218, 251, 0.55)",
    specs: [
      { label: "Frontend", value: "React 19 + Vite" },
      { label: "Typing", value: "Strict TS 5.x" },
      { label: "Graphics", value: "Three.js + R3F" },
    ],
    snippet: `// Client-side typed augmentation trigger
const payload: AugmentJobSpec = {
  productId: "sku_9042",
  variations: ["lifestyle", "warehouse", "macro"],
  preserveMask: true
};
await api.jobs.dispatch(payload);`,
  },
  {
    id: "hono",
    name: "Node.js + Hono",
    role: "Edge Runtime & Auth Server",
    category: "client",
    categoryLabel: "Client & Interface",
    href: "https://hono.dev",
    responsibility:
      "High-throughput Hono server mounted on Node.js. It manages authentication through Better Auth, handles streaming multipart uploads, and enforces tenant security boundaries.",
    implemented: true,
    brandColor: "#5FA04E",
    glowColor: "rgba(95, 160, 78, 0.55)",
    specs: [
      { label: "Runtime", value: "Node.js v22+" },
      { label: "Framework", value: "Hono Ultra-light" },
      { label: "Auth", value: "Better Auth Sessions" },
    ],
    snippet: `import { Hono } from "hono";
import { auth } from "@/server/auth";

export const app = new Hono();
app.on(["POST", "GET"], "/api/auth/**", (c) => 
  auth.handler(c.req.raw)
);`,
  },
  {
    id: "comfy",
    name: "ComfyUI",
    role: "Modular Graph Execution Engine",
    category: "ai",
    categoryLabel: "Inference & Generative AI",
    href: "https://github.com/comfyanonymous/ComfyUI",
    responsibility:
      "Node-graph pipeline runner that executes modular diffusion workflows. Controls prompt conditioning, latent noise schedules, ControlNet pose anchors, and multi-pass detail refinement.",
    implemented: false,
    brandColor: "#FF7700",
    glowColor: "rgba(255, 119, 0, 0.55)",
    specs: [
      { label: "Architecture", value: "Node DAG Pipeline" },
      { label: "Execution", value: "Queued Asynchronous" },
      { label: "Conditioning", value: "IP-Adapter + Depth" },
    ],
    snippet: `// ComfyUI workflow DAG node definition
{
  "3": {
    "class_type": "KSampler",
    "inputs": {
      "cfg": 7.5, "sampler_name": "euler_ancestral",
      "model": ["4", 0], "positive": ["6", 0]
    }
  }
}`,
  },
  {
    id: "sd",
    name: "Stable Diffusion XL",
    role: "Latent Diffusion Foundation Model",
    category: "ai",
    categoryLabel: "Inference & Generative AI",
    href: "https://github.com/Stability-AI/generative-models",
    responsibility:
      "Generative image model providing photorealistic visual variability. Synthesizes studio products into diverse environments (warehouses, streets, living spaces) while preserving identity.",
    implemented: false,
    brandColor: "#A855F7",
    glowColor: "rgba(168, 85, 247, 0.55)",
    specs: [
      { label: "Resolution", value: "1024x1024 Native" },
      { label: "Encoders", value: "Dual OpenCLIP + CLIP" },
      { label: "Consistency", value: "Reference LoRA Guiding" },
    ],
    snippet: `// Latent space environment conditioning
const synthesisConfig = {
  baseModel: "SDXL-1.0-Refiner",
  environmentLatent: "outdoor_dappled_sunlight",
  denoiseStrength: 0.62,
  subjectPreservation: 0.94
};`,
  },
  {
    id: "vlm",
    name: "Vision-Language Models",
    role: "Semantic Product Feature Parser",
    category: "ai",
    categoryLabel: "Inference & Generative AI",
    href: "https://huggingface.co/docs/transformers/tasks/image_text_to_text",
    responsibility:
      "Multimodal vision reader that inspects raw product photos to extract structural classes, materials, colors, and contextual tags. Also performs post-generation identity verification.",
    implemented: false,
    brandColor: "#FFD21E",
    glowColor: "rgba(255, 210, 30, 0.55)",
    specs: [
      { label: "Modality", value: "Vision + Text Embeds" },
      { label: "Extraction", value: "Zero-Shot Attributes" },
      { label: "QA Check", value: "Identity Cross-Val" },
    ],
    snippet: `// Vision parser attribute extraction
const extracted = await vlm.analyze(imageBuffer, {
  target: "product_taxonomy",
  attributes: ["material", "dominant_color", "silhouette"]
}); // -> { category: "running_shoe", mesh: 0.88 }`,
  },
  {
    id: "sql",
    name: "SQLite + Drizzle ORM",
    role: "Relational Metadata Store",
    category: "data",
    categoryLabel: "Persistence & Storage",
    href: "https://orm.drizzle.team",
    responsibility:
      "Embedded relational database with WAL-mode journaling. Stores operator authentication credentials, uploaded image paths, augmentation histories, and job batch records with full type safety.",
    implemented: true,
    brandColor: "#C5F74F",
    glowColor: "rgba(197, 247, 79, 0.55)",
    specs: [
      { label: "Engine", value: "SQLite 3 WAL Mode" },
      { label: "ORM", value: "Drizzle Type-Safe" },
      { label: "Latency", value: "<0.4ms In-Process" },
    ],
    snippet: `export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  originalPath: text("original_path").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
});`,
  },
  {
    id: "fs",
    name: "Filesystem Storage Engine",
    role: "High-Throughput Blob Storage",
    category: "data",
    categoryLabel: "Persistence & Storage",
    href: "https://nodejs.org/api/fs.html",
    responsibility:
      "Zero-overhead disk storage partitioned by account and SKU under data/uploads. High-resolution raw product photos and generated variants stream straight to disk without database bloat.",
    implemented: true,
    brandColor: "#34D399",
    glowColor: "rgba(52, 211, 153, 0.55)",
    specs: [
      { label: "Partitioning", value: "Per-Tenant Folder Tree" },
      { label: "I/O Mode", value: "Streaming Pipeline" },
      { label: "Throughput", value: "Direct OS Buffer Cache" },
    ],
    snippet: `// Direct file streaming pipeline
const targetDir = path.join(process.cwd(), "data/uploads", user.id);
await fs.promises.mkdir(targetDir, { recursive: true });
await pipeline(readableStream, fs.createWriteStream(filePath));`,
  },
] as const;
