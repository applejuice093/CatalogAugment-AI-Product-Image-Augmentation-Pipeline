import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { scrollState } from "@/lib/scroll";

type FadeMaterial = THREE.Material & {
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
  userData: {
    baseOpacity?: number;
    baseTransparent?: boolean;
    baseDepthWrite?: boolean;
  };
};

let fadingCount = 0;
const fadingListeners = new Set<() => void>();

function setFading(delta: number) {
  const next = Math.max(0, fadingCount + delta);
  if (next === fadingCount) return;
  fadingCount = next;
  for (const listener of fadingListeners) listener();
}

export function sceneIsFading() {
  return fadingCount > 0;
}

export function subscribeSceneFading(listener: () => void) {
  fadingListeners.add(listener);
  return () => {
    fadingListeners.delete(listener);
  };
}

function applyFade(root: THREE.Object3D, fade: number) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const list = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of list) {
      if (!("opacity" in material)) continue;
      const mat = material as FadeMaterial;
      if (mat.userData.baseOpacity === undefined) {
        mat.userData.baseOpacity = mat.opacity;
        mat.userData.baseTransparent = mat.transparent;
        mat.userData.baseDepthWrite = mat.depthWrite;
      }
      const base = mat.userData.baseOpacity;
      mat.opacity = base * fade;
      const fading = fade < 0.98;
      const transparent = fading || mat.userData.baseTransparent === true;
      if (mat.transparent !== transparent) {
        mat.transparent = transparent;
        mat.needsUpdate = true;
      }
      const depthWrite = fading ? false : mat.userData.baseDepthWrite !== false;
      if (mat.depthWrite !== depthWrite) mat.depthWrite = depthWrite;
    }
  });
}

export function useScenePresence(group: RefObject<THREE.Group | null>, active: boolean) {
  const fade = useRef(0);
  const held = useRef(false);

  const hold = (value: boolean) => {
    if (held.current === value) return;
    held.current = value;
    setFading(value ? 1 : -1);
  };

  useEffect(() => () => hold(false), []);

  useLayoutEffect(() => {
    const root = group.current;
    if (!root) return;
    if (scrollState.reduced) fade.current = active ? 1 : 0;
    applyFade(root, fade.current);
    root.visible = fade.current > 0.01;
  }, [active, group]);

  useFrame((_, delta) => {
    const root = group.current;
    if (!root) return;
    const target = active ? 1 : 0;
    if (scrollState.reduced) {
      fade.current = target;
      applyFade(root, target);
      root.visible = active;
      hold(false);
      return;
    }
    if (fade.current === target) {
      root.visible = target > 0;
      hold(false);
      return;
    }
    const next = THREE.MathUtils.damp(fade.current, target, 5, delta);
    fade.current = Math.abs(target - next) < 0.012 ? target : next;
    if (fade.current === 0) {
      applyFade(root, 0);
      root.visible = false;
      hold(false);
      return;
    }
    root.visible = true;
    applyFade(root, fade.current);
    hold(fade.current !== target);
  });
}
