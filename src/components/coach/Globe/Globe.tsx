"use client";

import { Line, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { countryCoords } from "@/lib/lichess-tv";

import type { ArcConnection } from "./country-data";

const GLOBE_RADIUS = 2.5;
const DOT_RADIUS = 0.032;
const ARC_HEIGHT = 0.65;

function latLngToVec3(lat: number, lng: number, radius: number = GLOBE_RADIUS) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = (lng * Math.PI) / 180;
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function MarkDot({
  pos,
  selected,
  onClick,
}: {
  pos: THREE.Vector3;
  selected: boolean;
  onClick: (e: ThreeEvent<PointerEvent>) => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (ref.current) {
      ref.current.scale.setScalar(selected ? 1.52 + 0.12 * Math.sin(performance.now() * 0.004) : 1);
      const mat = ref.current.material as THREE.MeshStandardMaterial;
      if (mat.emissiveIntensity !== undefined) {
        mat.emissiveIntensity = selected ? 1.4 + 0.3 * Math.sin(performance.now() * 0.005) : 0.55;
      }
    }
  });
  return (
    <mesh ref={ref} position={pos} onClick={onClick}>
      <sphereGeometry args={[DOT_RADIUS, 12, 12]} />
      <meshStandardMaterial
        color={selected ? "#f3c53d" : "#00d4aa"}
        emissive={selected ? "#f3c53d" : "#00d4aa"}
        emissiveIntensity={0.55}
        roughness={0.2}
      />
    </mesh>
  );
}

function ArcLine({
  from,
  to,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
}) {
  const mid = from.clone().add(to).normalize().multiplyScalar(GLOBE_RADIUS + ARC_HEIGHT);
  const curve = new THREE.QuadraticBezierCurve3(from.clone(), mid, to.clone());
  const points = curve.getPoints(48);

  return <Line points={points} color="#f3c53d" transparent opacity={0.55} lineWidth={0.8} />;
}

function Atmosphere() {
  return (
    <mesh>
      <sphereGeometry args={[GLOBE_RADIUS * 1.08, 64, 64]} />
      <meshBasicMaterial color="#f3c53d" transparent opacity={0.06} side={THREE.BackSide} />
    </mesh>
  );
}

function GlobeSurface() {
  return (
    <mesh>
      <sphereGeometry args={[GLOBE_RADIUS, 72, 72]} />
      <meshStandardMaterial
        color="#0a0e1a"
        roughness={0.85}
        metalness={0.12}
      />
    </mesh>
  );
}

interface GlobeSceneProps {
  highlights: string[];
  selected: string | null;
  onDotClick: (code: string) => void;
  arcs: ArcConnection[];
}

export function GlobeCanvas({ highlights, selected, onDotClick, arcs }: GlobeSceneProps) {
  const dots = useMemo(() => {
    const results: { code: string; pos: THREE.Vector3 }[] = [];
    const visited = new Set<string>();
    for (const code of highlights) {
      if (visited.has(code)) continue;
      const coords = countryCoords(code);
      if (coords) {
        visited.add(code);
        results.push({ code, pos: latLngToVec3(coords[0], coords[1]) });
      }
    }
    return results;
  }, [highlights]);

  const arcData = useMemo(() => {
    return arcs.slice(0, 12).reduce((acc, a) => {
      const fromCoords = countryCoords(a.from);
      const toCoords = countryCoords(a.to);
      if (!fromCoords || !toCoords) return acc;
      const from = latLngToVec3(fromCoords[0], fromCoords[1]);
      const to = latLngToVec3(toCoords[0], toCoords[1]);
      acc.push({ from, to, id: a.id });
      return acc;
    }, [] as Array<{ from: THREE.Vector3; to: THREE.Vector3; id: string }>);
  }, [arcs]);

  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 38 }}
      style={{ background: "transparent" }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.22} />
      <directionalLight position={[5, 3, 5]} intensity={0.6} color="#ffffff" />
      <pointLight position={[-3, 1, 2]} intensity={0.4} color="#f3c53d" />
      <pointLight position={[2, -2, -3]} intensity={0.3} color="#00d4aa" />

      <group>
        <GlobeSurface />
        <Atmosphere />
        {dots.map((dot) => (
          <MarkDot
            key={dot.code}
            pos={dot.pos}
            selected={selected === dot.code}
            onClick={(e) => {
              e.stopPropagation();
              onDotClick(dot.code);
            }}
          />
        ))}
        {arcData.map((a) => (
          <ArcLine key={a.id} from={a.from} to={a.to} />
        ))}
      </group>

      <OrbitControls
        enableZoom
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.35}
        minDistance={4.2}
        maxDistance={9}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  );
}