import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { scrollState } from "@/lib/scroll";
import { useScenePresence } from "./useScenePresence";

function useShoe() {
  return useMemo(() => {
    const extrude = {
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.02,
      bevelSegments: 2,
      curveSegments: 18,
    };
    const upperShape = new THREE.Shape();
    upperShape.moveTo(-1.15, 0.08);
    upperShape.lineTo(0.72, 0.05);
    upperShape.quadraticCurveTo(1.28, 0.08, 1.22, 0.28);
    upperShape.quadraticCurveTo(1.05, 0.5, 0.55, 0.48);
    upperShape.lineTo(0.05, 0.36);
    upperShape.quadraticCurveTo(-0.22, 0.58, -0.55, 0.4);
    upperShape.lineTo(-0.82, 0.2);
    upperShape.quadraticCurveTo(-1.22, 0.22, -1.15, 0.08);
    const upper = new THREE.ExtrudeGeometry(upperShape, { ...extrude, depth: 0.58 });
    upper.translate(0, 0.1, -0.29);

    const soleShape = new THREE.Shape();
    soleShape.moveTo(-1.28, 0);
    soleShape.lineTo(1.22, 0);
    soleShape.quadraticCurveTo(1.42, 0.02, 1.3, 0.12);
    soleShape.lineTo(-1.22, 0.1);
    soleShape.quadraticCurveTo(-1.4, 0.08, -1.28, 0);
    const sole = new THREE.ExtrudeGeometry(soleShape, { ...extrude, depth: 0.68 });
    sole.translate(0, -0.02, -0.34);

    return { sole, upper };
  }, []);
}

export function HeroProduct({ visible }: { visible: boolean }) {
  const group = useRef<THREE.Group>(null);
  const { sole, upper } = useShoe();
  useScenePresence(group, visible);

  useFrame(({ clock }) => {
    const groupRef = group.current;
    if (!groupRef || !visible) return;
    const t = scrollState.reduced ? 0.4 : clock.elapsedTime;
    const parallax = scrollState.reduced ? 0 : 0.16;
    const shrink = scrollState.scene === "hero" ? 1 - scrollState.sceneT * 0.25 : 1;
    groupRef.rotation.y = 0.18 + Math.sin(t * 0.4) * 0.22 + scrollState.mouseX * parallax;
    groupRef.rotation.x = -0.08 + scrollState.mouseY * parallax * 0.35;
    const is2Xl = typeof window !== "undefined" && window.innerWidth >= 1536;
    const isXl = typeof window !== "undefined" && window.innerWidth >= 1280;
    groupRef.scale.setScalar((is2Xl ? 1.38 : isXl ? 1.25 : 1.15) * shrink);
    groupRef.position.x =
      scrollState.tier === "mobile"
        ? 0
        : is2Xl
          ? 2.1
          : isXl
            ? 1.7
            : 1.35;
    groupRef.position.y = Math.sin(t * 0.8) * (scrollState.reduced ? 0 : 0.06);
  });

  return (
    <group ref={group}>
      <mesh geometry={sole}>
        <meshStandardMaterial color="#f4f4f8" roughness={0.45} metalness={0.05} />
      </mesh>
      <mesh geometry={upper}>
        <meshStandardMaterial color="#16181f" roughness={0.55} metalness={0.08} />
      </mesh>
      <mesh geometry={upper}>
        <meshBasicMaterial color="#d6e36a" wireframe transparent opacity={0.22} />
      </mesh>
      {[0.9, 1.25].map((radius, index) => (
        <mesh key={radius} rotation={[Math.PI / 2.4, index * 0.4, 0.2]}>
          <torusGeometry args={[radius, 0.008, 12, 80]} />
          <meshBasicMaterial
            color="#d6e36a"
            transparent
            opacity={0.85}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
