import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { environments } from "@/data/content";
import { scrollState } from "@/lib/scroll";
import { useScenePresence } from "./useScenePresence";

export function FloatingGallery({ visible }: { visible: boolean }) {
  const group = useRef<THREE.Group>(null);
  useScenePresence(group, visible);
  const textures = useTexture(environments.map((item) => item.image));

  useFrame(() => {
    const root = group.current;
    if (!root || !visible) return;
    const spread = 0.4 + scrollState.sceneT * 1.5;
    root.children.forEach((child, index) => {
      const side = index - 2;
      child.position.x = side * spread * 0.85;
      child.position.y = Math.sin(index + scrollState.sceneT * 3) * 0.18;
      child.position.z = -Math.abs(side) * 0.35;
      const target = 0.7 + scrollState.sceneT * 0.45;
      child.scale.setScalar(THREE.MathUtils.lerp(child.scale.x, target, 0.08));
    });
    root.rotation.y = scrollState.mouseX * 0.12;
    root.position.x = scrollState.tier === "mobile" ? 0 : 0.2;
  });

  return (
    <group ref={group} position={[0.2, 0, 0]}>
      {textures.map((texture, index) => (
        <mesh key={environments[index].id} position={[(index - 2) * 0.9, 0, 0]}>
          <planeGeometry args={[1.15, 1.15]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
