import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { scrollState, type SceneId } from "@/lib/scroll";
import { FloatingGallery } from "./FloatingGallery";
import { HeroProduct } from "./HeroProduct";
import { PipelineScene } from "./PipelineScene";
import { ProductScanner } from "./ProductScanner";
import { sceneIsFading, subscribeSceneFading } from "./useScenePresence";

type SceneCanvasProps = {
  scene: SceneId;
  activeNode: string;
};

function RenderBudget() {
  const last = useRef(0);
  useFrame(({ gl, scene, camera }) => {
    const now = performance.now();
    const fading = sceneIsFading();
    if (scrollState.scene === "none" && !fading) return;
    const scrolling = now - scrollState.lastScroll < 140;
    if (!fading && scrolling && now - last.current < 32) return;
    last.current = now;
    gl.render(scene, camera);
  }, 1);
  return null;
}

export function SceneCanvas({ scene, activeNode }: SceneCanvasProps) {
  const [fading, setFading] = useState(false);
  useEffect(() => subscribeSceneFading(() => setFading(sceneIsFading())), []);
  const alive = (scene !== "none" || fading) && !scrollState.hidden && scrollState.webgl;

  return (
    <Canvas
      className="pointer-events-none"
      dpr={[1, 2]}
      camera={{ position: [0, 0.1, 6.2], fov: 38 }}
      frameloop={alive ? "always" : "demand"}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      style={{ position: "fixed", inset: 0, zIndex: 0 }}
      onCreated={({ gl }) => {
        gl.setClearColor("#101210");
      }}
    >
      <RenderBudget />
      <ambientLight intensity={0.45} />
      <directionalLight position={[3, 4, 2]} intensity={1.4} color="#f5f5fa" />
      <pointLight position={[-2, 1, 2]} intensity={2.2} color="#d6e36a" distance={8} />
      <pointLight position={[2, -1, 2]} intensity={1.4} color="#e8e6df" distance={8} />
      <HeroProduct visible={scene === "hero"} />
      <Suspense fallback={null}>
        <FloatingGallery visible={false} />
      </Suspense>
      <Suspense fallback={null}>
        <ProductScanner visible={false} />
      </Suspense>
      <PipelineScene active={activeNode} visible={scene === "technology"} />
    </Canvas>
  );
}
