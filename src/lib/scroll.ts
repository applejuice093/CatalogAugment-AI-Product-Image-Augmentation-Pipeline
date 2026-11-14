export type SceneId =
  | "hero"
  | "workflow"
  | "showcase"
  | "research"
  | "technology"
  | "start"
  | "none";

export type Tier = "desktop" | "tablet" | "mobile";

const scenes: SceneId[] = [
  "hero",
  "workflow",
  "showcase",
  "research",
  "technology",
  "start",
];

const navIds = ["platform", "workflow", "research", "technology", "about"];

export const scrollState = {
  y: 0,
  page: 0,
  scene: "hero" as SceneId,
  sceneT: 0,
  mouseX: 0,
  mouseY: 0,
  tier: "desktop" as Tier,
  reduced: false,
  webgl: true,
  navId: "platform",
  compact: false,
  hidden: false,
  lastScroll: 0,
};

type Listener = () => void;
const listeners = new Set<Listener>();
const stageListeners = new Set<(stage: number) => void>();
let reactKey = "";
let workflowStage = 0;
const sceneNodes: HTMLElement[] = [];
const navNodes: HTMLElement[] = [];

function collectNodes() {
  sceneNodes.length = 0;
  for (const id of scenes) {
    const el = document.querySelector<HTMLElement>(`[data-scene="${id}"]`);
    if (el) sceneNodes.push(el);
  }
  navNodes.length = 0;
  for (const id of navIds) {
    const el = document.getElementById(id);
    if (el) navNodes.push(el);
  }
}

export function subscribeWorkflowStage(listener: (stage: number) => void) {
  stageListeners.add(listener);
  listener(workflowStage);
  return () => {
    stageListeners.delete(listener);
  };
}

export function subscribeScroll(listener: Listener) {
  listeners.add(listener);
  listener();
  return () => {
    listeners.delete(listener);
  };
}

function publish() {
  const next = [
    scrollState.scene,
    scrollState.navId,
    scrollState.tier,
    scrollState.reduced,
    scrollState.webgl,
    scrollState.compact,
    scrollState.hidden,
  ].join("|");
  if (next === reactKey) return;
  reactKey = next;
  listeners.forEach((listener) => listener());
}

function measure() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  scrollState.y = window.scrollY;
  scrollState.page = max > 0 ? window.scrollY / max : 0;
  scrollState.compact = window.scrollY > 12;

  const width = window.innerWidth;
  scrollState.tier = width < 760 ? "mobile" : width < 1100 ? "tablet" : "desktop";

  if (sceneNodes.length === 0 || sceneNodes.some((el) => !el.isConnected)) {
    collectNodes();
  }

  let best: SceneId = "none";
  let bestRatio = 0;
  let bestT = 0;
  const view = window.innerHeight;
  for (const el of sceneNodes) {
    const rect = el.getBoundingClientRect();
    const visible = Math.min(rect.bottom, view) - Math.max(rect.top, 0);
    const ratio = visible / view;
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = (el.dataset.scene as SceneId) || "none";
      const top = rect.top + window.scrollY;
      const range = el.offsetHeight - view;
      bestT = range > 0 ? Math.min(1, Math.max(0, (window.scrollY - top) / range)) : 0;
    }
  }
  scrollState.scene = bestRatio > 0.28 ? best : "none";
  scrollState.sceneT = bestT;

  let current = "platform";
  const mark = view * 0.38;
  for (const el of navNodes) {
    if (el.getBoundingClientRect().top < mark) current = el.id;
  }
  scrollState.navId = current;

  // Track workflow stage directly whenever workflow element is available,
  // ensuring stage updates reliably regardless of cross-scene ratios or scroll velocity
  const workflowEl =
    sceneNodes.find((n) => n.dataset.scene === "workflow") ||
    document.getElementById("workflow") ||
    document.querySelector<HTMLElement>('[data-scene="workflow"]');

  if (workflowEl) {
    const rect = workflowEl.getBoundingClientRect();
    const range = workflowEl.offsetHeight - view;
    if (range > 0) {
      const topOffset = 64; // Sticky top offset below navbar
      const scrolled = topOffset - rect.top;
      const t = Math.max(0, Math.min(1, scrolled / range));
      const next = Math.min(3, Math.floor(t * 4));
      if (next !== workflowStage) {
        workflowStage = next;
        stageListeners.forEach((listener) => listener(next));
      }
    }
  }

  publish();
}

let started = false;

export function startScrollLoop() {
  if (started) return () => {};
  started = true;

  const canvas = document.createElement("canvas");
  scrollState.webgl = Boolean(
    canvas.getContext("webgl2") || canvas.getContext("webgl"),
  );
  const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  scrollState.reduced = reducedQuery.matches;

  let ticking = false;
  const requestMeasure = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      measure();
    });
  };
  const onScroll = () => {
    scrollState.lastScroll = performance.now();
    requestMeasure();
  };
  const onResize = () => {
    collectNodes();
    requestMeasure();
  };

  const onPointer = (event: PointerEvent) => {
    scrollState.mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    scrollState.mouseY = (event.clientY / window.innerHeight) * 2 - 1;
  };
  const onReduced = () => {
    scrollState.reduced = reducedQuery.matches;
    publish();
  };
  const onVisibility = () => {
    scrollState.hidden = document.hidden;
    publish();
  };
  const onAnchor = (event: MouseEvent) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest("a[href^='#']");
    if (!(link instanceof HTMLAnchorElement)) return;
    const id = link.getAttribute("href")?.slice(1);
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    event.preventDefault();
    el.scrollIntoView({
      behavior: scrollState.reduced ? "auto" : "smooth",
      block: "start",
    });
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize);
  window.addEventListener("pointermove", onPointer, { passive: true });
  reducedQuery.addEventListener("change", onReduced);
  document.addEventListener("visibilitychange", onVisibility);
  document.addEventListener("click", onAnchor);
  measure();

  return () => {
    started = false;
    sceneNodes.length = 0;
    navNodes.length = 0;
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("pointermove", onPointer);
    reducedQuery.removeEventListener("change", onReduced);
    document.removeEventListener("visibilitychange", onVisibility);
    document.removeEventListener("click", onAnchor);
  };
}

export function scrollWorkflowTo(stageIndex: number) {
  const el = document.getElementById("workflow");
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY;
  const range = el.offsetHeight - window.innerHeight;
  const t = (stageIndex + 0.45) / 4;
  window.scrollTo({
    top: top + range * t,
    behavior: scrollState.reduced ? "auto" : "smooth",
  });
}
