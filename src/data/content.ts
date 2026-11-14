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

export const technologies = [
  {
    id: "react",
    name: "React + TypeScript",
    href: "https://react.dev",
    responsibility:
      "This page and the signed-in upload control. The interface is client-rendered and typed end to end.",
    implemented: true,
  },
  {
    id: "hono",
    name: "Node.js",
    href: "https://hono.dev",
    responsibility:
      "A Hono server on Node. It mounts Better Auth and the upload routes beside the Vite app.",
    implemented: true,
  },
  {
    id: "comfy",
    name: "ComfyUI",
    href: "https://github.com/comfyanonymous/ComfyUI",
    responsibility:
      "The graph runner intended for augmentation jobs. It is not connected in this build.",
    implemented: false,
  },
  {
    id: "sd",
    name: "Stable Diffusion / SDXL",
    href: "https://github.com/Stability-AI/generative-models",
    responsibility:
      "The image model intended to vary light, setting, and camera. Generation is not wired yet.",
    implemented: false,
  },
  {
    id: "vlm",
    name: "Vision-Language Models",
    href: "https://huggingface.co/docs/transformers/tasks/image_text_to_text",
    responsibility:
      "The reader intended to turn a product photo into category, color, material, and attributes. The research panel on this page is illustrative demo data.",
    implemented: false,
  },
  {
    id: "sql",
    name: "SQL",
    href: "https://orm.drizzle.team",
    responsibility:
      "SQLite on disk, through Drizzle. It holds Better Auth tables and the metadata for each uploaded file.",
    implemented: true,
  },
  {
    id: "fs",
    name: "Filesystem storage",
    href: "https://nodejs.org/api/fs.html",
    responsibility:
      "Uploaded images are written under data/uploads, one folder per account. The database stores the path, not the bytes.",
    implemented: true,
  },
] as const;
