import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { scrollState } from "@/lib/scroll";
import { useScenePresence } from "./useScenePresence";

export function ProductScanner({ visible }: { visible: boolean }) {
  const scan = useRef<THREE.Mesh>(null);
  const group = useRef<THREE.Group>(null);
  useScenePresence(group, visible);
  const texture = useTexture("/images/studio.jpg");

  useFrame(({ clock }) => {
    const line = scan.current;
    if (!line || !visible || scrollState.reduced) return;
    line.position.y = Math.sin(clock.elapsedTime * 1.4) * 0.72;
  });

  return (
    <group ref={group} position={[scrollState.tier === "mobile" ? 0 : 1.2, 0, 0]}>
      <mesh>
        <planeGeometry args={[2.1, 2.1]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <mesh ref={scan}>
        <planeGeometry args={[2.16, 0.015]} />
        <meshBasicMaterial color="#d6e36a" transparent opacity={0.9} toneMapped={false} />
      </mesh>
      {[
        [-1.05, 1.05],
        [1.05, 1.05],
        [-1.05, -1.05],
        [1.05, -1.05],
      ].map(([x, y]) => (
        <mesh key={`${x}-${y}`} position={[x, y, 0.02]}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshBasicMaterial color="#d6e36a" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
