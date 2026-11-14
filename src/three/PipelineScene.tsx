import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { technologies } from "@/data/content";
import { useScenePresence } from "./useScenePresence";

type PipelineSceneProps = {
  active: string;
  visible: boolean;
};

export function PipelineScene({ active, visible }: PipelineSceneProps) {
  const group = useRef<THREE.Group>(null);
  const painted = useRef("");
  useScenePresence(group, visible);
  const layout = useMemo(() => {
    return technologies.map((node, index) => {
      const count = technologies.length;
      const angle = (index / count) * Math.PI * 2;
      const next = ((index + 1) / count) * Math.PI * 2;
      const x = Math.cos(angle) * 1.7;
      const y = Math.sin(angle) * 0.95;
      const x2 = Math.cos(next) * 1.7;
      const y2 = Math.sin(next) * 0.95;
      return {
        id: node.id,
        x,
        y,
        length: Math.hypot(x2 - x, y2 - y),
        rotation: Math.atan2(y2 - y, x2 - x),
        mx: (x + x2) / 2,
        my: (y + y2) / 2,
      };
    });
  }, []);

  useFrame(() => {
    const root = group.current;
    if (!root || !visible || painted.current === active) return;
    painted.current = active;
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const id = object.userData.nodeId as string | undefined;
      if (!id) return;
      const material = object.material;
      if (!(material instanceof THREE.MeshStandardMaterial)) return;
      const on = id === active;
      material.emissive.set(on ? "#d6e36a" : "#191c18");
      material.emissiveIntensity = on ? 0.9 : 0.04;
    });
  });

  return (
    <group ref={group} position={[0, 0.15, -0.2]}>
      {layout.map((node) => (
        <group key={node.id}>
          <mesh position={[node.mx, node.my, 0]} rotation={[0, 0, node.rotation]}>
            <boxGeometry args={[node.length, 0.012, 0.012]} />
            <meshBasicMaterial color="#d6e36a" transparent opacity={0.35} />
          </mesh>
          <mesh position={[node.x, node.y, 0]} userData={{ nodeId: node.id }}>
            <sphereGeometry args={[0.13, 24, 24]} />
            <meshStandardMaterial color="#1a1e2e" emissive="#121522" roughness={0.35} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
