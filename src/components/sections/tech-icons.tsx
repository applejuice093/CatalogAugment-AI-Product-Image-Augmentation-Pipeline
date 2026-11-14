import type { SVGProps } from "react";

export function ReactTsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      {/* React Atom */}
      <g transform="translate(13, 14)">
        <circle cx="0" cy="0" r="2.2" fill="#61DAFB" />
        <ellipse rx="10" ry="3.8" stroke="#61DAFB" strokeWidth="1.2" fill="none" opacity="0.9" />
        <ellipse rx="10" ry="3.8" stroke="#61DAFB" strokeWidth="1.2" fill="none" opacity="0.9" transform="rotate(60)" />
        <ellipse rx="10" ry="3.8" stroke="#61DAFB" strokeWidth="1.2" fill="none" opacity="0.9" transform="rotate(120)" />
      </g>
      {/* TypeScript Mini Badge */}
      <g transform="translate(19, 18)">
        <rect width="12" height="12" rx="2.5" fill="#3178C6" stroke="#101210" strokeWidth="1.2" />
        <path
          fill="#FFFFFF"
          d="M3.2 4.2H1V5H1.8V9H2.5V5H3.2V4.2ZM6.4 5.3C6.2 5.1 5.9 4.9 5.5 4.9C5.1 4.9 4.8 5 4.6 5.2C4.4 5.4 4.3 5.6 4.3 5.9C4.3 6.2 4.4 6.5 4.6 6.7C4.8 6.9 5.1 7.1 5.5 7.2C5.9 7.3 6.2 7.5 6.3 7.7C6.5 7.9 6.5 8.1 6.5 8.4C6.5 8.8 6.3 9.1 6 9.3C5.7 9.5 5.3 9.6 4.8 9.6C4.3 9.6 3.9 9.5 3.6 9.2L3.9 8.5C4.2 8.7 4.5 8.9 4.8 8.9C5.1 8.9 5.3 8.8 5.5 8.7C5.6 8.5 5.7 8.4 5.7 8.2C5.7 8 5.6 7.8 5.4 7.7C5.2 7.5 4.9 7.4 4.5 7.2C4.1 7.1 3.8 6.9 3.6 6.7C3.4 6.4 3.3 6.1 3.3 5.8C3.3 5.4 3.5 5.1 3.8 4.8C4.1 4.5 4.5 4.4 5.1 4.4C5.5 4.4 6 4.5 6.4 4.8L6.4 5.3Z"
        />
      </g>
    </svg>
  );
}

export function NodeHonoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      {/* Node.js 3D Hexagon */}
      <path
        d="M16 2L28 9V23L16 30L4 23V9L16 2Z"
        fill="#141E15"
        stroke="#5FA04E"
        strokeWidth="1.8"
      />
      <path
        d="M16 4.5L25.5 10.2V21.8L16 27.5L6.5 21.8V10.2L16 4.5Z"
        fill="#1C2B1D"
        opacity="0.8"
      />
      {/* Node Stylized Emblem */}
      <path
        d="M16 9.5C15.6 9.5 15.2 9.7 14.9 9.9L10.8 12.3C10.2 12.7 9.8 13.4 9.8 14.1V18.9C9.8 19.6 10.2 20.3 10.8 20.7L14.9 23.1C15.5 23.5 16.5 23.5 17.1 23.1L21.2 20.7C21.8 20.3 22.2 19.6 22.2 18.9V14.1C22.2 13.4 21.8 12.7 21.2 12.3L17.1 9.9C16.8 9.7 16.4 9.5 16 9.5Z"
        fill="#68A063"
      />
      <path
        d="M16 11.8L19.2 13.7L16 15.6L12.8 13.7L16 11.8Z"
        fill="#83CD29"
      />
      <path
        d="M12 15L15.2 16.9V20.7L12 18.8V15Z"
        fill="#5FA04E"
      />
      <path
        d="M20 15V18.8L16.8 20.7V16.9L20 15Z"
        fill="#437734"
      />
    </svg>
  );
}

export function ComfyUiIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      {/* Dark Module Grid Backdrop */}
      <rect x="2" y="2" width="28" height="28" rx="6" fill="#181410" stroke="#FF7700" strokeWidth="1.5" strokeOpacity="0.4" />
      {/* Node 1: Input / Conditioning */}
      <rect x="5" y="6" width="9" height="7" rx="2" fill="#FF7700" fillOpacity="0.9" />
      <rect x="6" y="7.5" width="4" height="1.5" rx="0.75" fill="#FFF" fillOpacity="0.8" />
      {/* Node 2: Sampler / Latent */}
      <rect x="5" y="19" width="9" height="7" rx="2" fill="#FF9933" fillOpacity="0.9" />
      <rect x="6" y="20.5" width="5" height="1.5" rx="0.75" fill="#FFF" fillOpacity="0.8" />
      {/* Node 3: Output / VAE Decode */}
      <rect x="18" y="12" width="9" height="8" rx="2.5" fill="#D6E36A" fillOpacity="0.95" />
      <circle cx="22.5" cy="16" r="2" fill="#101210" />
      <circle cx="22.5" cy="16" r="1" fill="#FFF" />
      {/* Bezier Interconnect Wires */}
      <path
        d="M14 9.5C16 9.5 16 14.5 18 14.5"
        stroke="#FF7700"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M14 22.5C16 22.5 16 17.5 18 17.5"
        stroke="#D6E36A"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Node Terminal Pins */}
      <circle cx="14" cy="9.5" r="1.5" fill="#FFFFFF" />
      <circle cx="14" cy="22.5" r="1.5" fill="#FFFFFF" />
      <circle cx="18" cy="14.5" r="1.5" fill="#FFFFFF" />
      <circle cx="18" cy="17.5" r="1.5" fill="#FFFFFF" />
    </svg>
  );
}

export function StableDiffusionIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <defs>
        <radialGradient id="sd-radial" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#EC4899" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sd-spark" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F472B6" />
          <stop offset="0.5" stopColor="#C084FC" />
          <stop offset="1" stopColor="#818CF8" />
        </linearGradient>
      </defs>
      {/* Ambient Radial Bloom */}
      <circle cx="16" cy="16" r="13" fill="url(#sd-radial)" />
      {/* Core Octagram Starburst of Stability AI */}
      <path
        d="M16 3L18.8 11.2C19.2 12.5 20.2 13.5 21.5 13.9L29 16L21.5 18.1C20.2 18.5 19.2 19.5 18.8 20.8L16 29L13.2 20.8C12.8 19.5 11.8 18.5 10.5 18.1L3 16L10.5 13.9C11.8 13.5 12.8 12.5 13.2 11.2L16 3Z"
        fill="url(#sd-spark)"
      />
      {/* Core Light Center */}
      <circle cx="16" cy="16" r="3.2" fill="#FFFFFF" />
      {/* Diagonal Spark Points */}
      <circle cx="23.5" cy="8.5" r="1.6" fill="#F472B6" />
      <circle cx="8.5" cy="23.5" r="1.6" fill="#818CF8" />
      <circle cx="8.5" cy="8.5" r="1.6" fill="#C084FC" />
      <circle cx="23.5" cy="23.5" r="1.6" fill="#C084FC" />
    </svg>
  );
}

export function VlmHuggingFaceIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      {/* Hugging Face Yellow Head */}
      <circle cx="16" cy="16" r="12" fill="#FFD21E" stroke="#E6B800" strokeWidth="1.2" />
      {/* Expressive Eyes */}
      <ellipse cx="11.5" cy="13.5" rx="1.8" ry="2.2" fill="#262626" />
      <ellipse cx="20.5" cy="13.5" rx="1.8" ry="2.2" fill="#262626" />
      <circle cx="12.2" cy="12.5" r="0.75" fill="#FFFFFF" />
      <circle cx="21.2" cy="12.5" r="0.75" fill="#FFFFFF" />
      {/* Rosy Cheeks */}
      <ellipse cx="8.8" cy="17" rx="2" ry="1.2" fill="#FFA000" fillOpacity="0.7" />
      <ellipse cx="23.2" cy="17" rx="2" ry="1.2" fill="#FFA000" fillOpacity="0.7" />
      {/* Happy Smile */}
      <path
        d="M11.5 18C13 21 19 21 20.5 18"
        stroke="#262626"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
      {/* Hugging Hands */}
      <path
        d="M5.5 19.5C6.5 16.5 10 17 10.5 20.5C10 22 7 23 5.5 19.5Z"
        fill="#FFA000"
        stroke="#E6B800"
        strokeWidth="0.8"
      />
      <path
        d="M26.5 19.5C25.5 16.5 22 17 21.5 20.5C22 22 25 23 26.5 19.5Z"
        fill="#FFA000"
        stroke="#E6B800"
        strokeWidth="0.8"
      />
    </svg>
  );
}

export function SqlDrizzleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      {/* Dark Database Container */}
      <rect x="3" y="3" width="26" height="26" rx="6" fill="#0A1820" stroke="#003B57" strokeWidth="1.6" />
      {/* SQLite Cylindrical Disk Layers */}
      <path
        d="M8 9C8 7.3 11.6 6 16 6C20.4 6 24 7.3 24 9C24 10.7 20.4 12 16 12C11.6 12 8 10.7 8 9Z"
        fill="#0E3345"
        stroke="#1E5D7A"
        strokeWidth="1.2"
      />
      <path
        d="M8 13.5C8 15.2 11.6 16.5 16 16.5C20.4 16.5 24 15.2 24 13.5M8 18C8 19.7 11.6 21 16 21C20.4 21 24 19.7 24 18M8 9V22.5C8 24.2 11.6 25.5 16 25.5C20.4 25.5 24 24.2 24 22.5V9"
        stroke="#1E5D7A"
        strokeWidth="1.2"
        fill="none"
      />
      {/* Drizzle ORM Neon Lightning Drop */}
      <g transform="translate(14, 11)">
        <path
          d="M6 1C3 4.5 1 7.5 1 10C1 12.8 3.2 15 6 15C8.8 15 11 12.8 11 10C11 7.5 9 4.5 6 1Z"
          fill="#C5F74F"
          stroke="#101210"
          strokeWidth="1.2"
        />
        <path
          d="M6.5 4.5L4 9H7.5L5.5 13.5"
          stroke="#003B57"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

export function FileSystemIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      {/* High-Speed Storage Enclosure */}
      <rect x="3" y="4" width="26" height="10" rx="3" fill="#13231B" stroke="#34D399" strokeWidth="1.5" />
      <rect x="3" y="18" width="26" height="10" rx="3" fill="#13231B" stroke="#34D399" strokeWidth="1.5" />
      {/* Drive 1 Status & Data Lanes */}
      <circle cx="8" cy="9" r="1.8" fill="#34D399" />
      <line x1="13" y1="9" x2="24" y2="9" stroke="#34D399" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="3 2" />
      {/* Drive 2 Status & Data Lanes */}
      <circle cx="8" cy="23" r="1.8" fill="#34D399" />
      <line x1="13" y1="23" x2="24" y2="23" stroke="#34D399" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="3 2" />
      {/* Micro-activity indicators */}
      <circle cx="26" cy="9" r="1" fill="#10B981" />
      <circle cx="26" cy="23" r="1" fill="#10B981" />
    </svg>
  );
}

export function TechIcon({ id, className, style }: { id: string; className?: string; style?: React.CSSProperties }) {
  switch (id) {
    case "react":
      return <ReactTsIcon className={className} style={style} />;
    case "hono":
      return <NodeHonoIcon className={className} style={style} />;
    case "comfy":
      return <ComfyUiIcon className={className} style={style} />;
    case "sd":
      return <StableDiffusionIcon className={className} style={style} />;
    case "vlm":
      return <VlmHuggingFaceIcon className={className} style={style} />;
    case "sql":
      return <SqlDrizzleIcon className={className} style={style} />;
    case "fs":
      return <FileSystemIcon className={className} style={style} />;
    default:
      return <ReactTsIcon className={className} style={style} />;
  }
}
