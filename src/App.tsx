import { lazy, Suspense, useEffect, useState } from "react";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { About } from "@/components/sections/About";
import { FinalCta } from "@/components/sections/FinalCta";
import { Hero } from "@/components/sections/Hero";
import { Problem } from "@/components/sections/Problem";
import { CurtainReveal } from "@/components/sections/CurtainReveal";
import { Research } from "@/components/sections/Research";
import { Showcase } from "@/components/sections/Showcase";
import { Technology } from "@/components/sections/Technology";
import { Workflow } from "@/components/sections/Workflow";
import { Scene } from "@/components/scenes/Scene";
import { SparkField } from "@/components/effects/SparkField";
import { WebGLErrorBoundary } from "@/components/effects/WebGLErrorBoundary";
import { scrollState, startScrollLoop, subscribeScroll, type SceneId, type Tier } from "@/lib/scroll";

const SceneCanvas = lazy(() =>
  import("@/three/SceneCanvas").then((module) => ({ default: module.SceneCanvas })),
);

type Snap = {
  scene: SceneId;
  navId: string;
  compact: boolean;
  tier: Tier;
  webgl: boolean;
};

function readSnap(): Snap {
  return {
    scene: scrollState.scene,
    navId: scrollState.navId,
    compact: scrollState.compact,
    tier: scrollState.tier,
    webgl: scrollState.webgl,
  };
}

function Page() {
  const [snap, setSnap] = useState<Snap>(readSnap);
  const [node, setNode] = useState("react");

  useEffect(() => subscribeScroll(() => setSnap(readSnap())), []);
  useEffect(() => startScrollLoop(), []);

  const [isScene, setIsScene] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.location.search.includes("scene") || window.location.hash === "#scene";
  });

  useEffect(() => {
    const handlePop = () => {
      setIsScene(window.location.search.includes("scene") || window.location.hash === "#scene");
    };
    window.addEventListener("popstate", handlePop);
    window.addEventListener("hashchange", handlePop);
    return () => {
      window.removeEventListener("popstate", handlePop);
      window.removeEventListener("hashchange", handlePop);
    };
  }, []);

  if (isScene) {
    return (
      <div className="relative min-h-screen w-full bg-[#07080c] flex flex-col justify-start">
        <Scene />
      </div>
    );
  }

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      {snap.webgl ? (
        <WebGLErrorBoundary>
          <Suspense fallback={null}>
            <SceneCanvas scene={snap.scene} activeNode={node} />
          </Suspense>
        </WebGLErrorBoundary>
      ) : null}
      <SparkField />
      <Navbar compact={snap.compact} active={snap.navId} />
      <main id="main">
        <Hero />
        <Problem />
        <CurtainReveal />
        <Workflow />
        <Showcase />
        <Research />
        <Technology active={node} onSelect={setNode} />
        <About />
        <FinalCta />
      </main>
      <Footer />
      <p className="sr-only">Layout tier {snap.tier}</p>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Page />
    </AuthProvider>
  );
}
