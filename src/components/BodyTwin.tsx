import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import { Bone, Brain, Eye, HeartPulse, Moon, Shield } from "lucide-react";
import type { ReactNode } from "react";
import { SYSTEM_LABEL } from "../data/content";
import { SYSTEMS, type BodySystem, type RiskLevel } from "../data/types";
import { useMission } from "../store/mission";
import { levelChip } from "./levels";

const ICONS: Record<BodySystem, typeof HeartPulse> = {
  cardiovascular: HeartPulse,
  musculoskeletal: Bone,
  brain: Brain,
  sleep: Moon,
  immune: Shield,
  vision: Eye,
};

function tone(level: RiskLevel, selected: boolean, ghost: boolean) {
  if (ghost) {
    return { color: "#d9fff6", emissive: "#d9fff6", intensity: 0.15, opacity: 0.2, transparent: true };
  }
  const emissive = level === "red" ? "#ff4d67" : level === "amber" ? "#ffb020" : "#3ee0a6";
  return {
    color: "#163044",
    emissive,
    intensity: selected ? 1.2 : level === "green" ? 0.32 : 0.9,
    opacity: 1,
    transparent: false,
  };
}

function Part({
  system,
  levels,
  selected,
  ghost,
  onSelect,
  position,
  rotation,
  children,
}: {
  system: BodySystem;
  levels: Record<BodySystem, RiskLevel>;
  selected: BodySystem;
  ghost: boolean;
  onSelect: (system: BodySystem) => void;
  position: [number, number, number];
  rotation?: [number, number, number];
  children: ReactNode;
}) {
  const material = tone(levels[system], selected === system, ghost);
  return (
    <mesh
      position={position}
      rotation={rotation}
      onClick={(event) => {
        if (ghost) return;
        event.stopPropagation();
        onSelect(system);
      }}
    >
      {children}
      <meshStandardMaterial
        color={material.color}
        emissive={material.emissive}
        emissiveIntensity={material.intensity}
        transparent={material.transparent}
        opacity={material.opacity}
        roughness={0.42}
        metalness={0.18}
        depthWrite={!ghost}
      />
    </mesh>
  );
}

function Figure({
  levels,
  selected,
  ghost,
  onSelect,
}: {
  levels: Record<BodySystem, RiskLevel>;
  selected: BodySystem;
  ghost: boolean;
  onSelect: (system: BodySystem) => void;
}) {
  const shared = { levels, selected, ghost, onSelect };
  return (
    <group position={[0, -0.85, 0]} scale={ghost ? 1.04 : 1}>
      <Part {...shared} system="brain" position={[0, 1.62, 0]}>
        <sphereGeometry args={[0.28, 28, 28]} />
      </Part>
      <Part {...shared} system="vision" position={[0.1, 1.64, 0.2]}>
        <sphereGeometry args={[0.05, 16, 16]} />
      </Part>
      <Part {...shared} system="vision" position={[-0.1, 1.64, 0.2]}>
        <sphereGeometry args={[0.05, 16, 16]} />
      </Part>
      <Part {...shared} system="sleep" position={[0, 1.86, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.24, 0.035, 10, 28]} />
      </Part>
      <Part {...shared} system="cardiovascular" position={[0, 1.12, 0.06]}>
        <sphereGeometry args={[0.16, 24, 24]} />
      </Part>
      <Part {...shared} system="immune" position={[0, 0.72, 0]}>
        <capsuleGeometry args={[0.24, 0.28, 8, 16]} />
      </Part>
      <Part {...shared} system="musculoskeletal" position={[-0.42, 0.95, 0]} rotation={[0, 0, 0.35]}>
        <capsuleGeometry args={[0.07, 0.46, 6, 12]} />
      </Part>
      <Part {...shared} system="musculoskeletal" position={[0.42, 0.95, 0]} rotation={[0, 0, -0.35]}>
        <capsuleGeometry args={[0.07, 0.46, 6, 12]} />
      </Part>
      <Part {...shared} system="musculoskeletal" position={[-0.16, 0.12, 0]}>
        <capsuleGeometry args={[0.09, 0.52, 6, 12]} />
      </Part>
      <Part {...shared} system="musculoskeletal" position={[0.16, 0.12, 0]}>
        <capsuleGeometry args={[0.09, 0.52, 6, 12]} />
      </Part>
    </group>
  );
}

function Scene({
  levels,
  selected,
  showGhost,
  onSelect,
  autoRotate,
}: {
  levels: Record<BodySystem, RiskLevel>;
  selected: BodySystem;
  showGhost: boolean;
  onSelect: (system: BodySystem) => void;
  autoRotate: boolean;
}) {
  return (
    <>
      <color attach="background" args={["#07111c"]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[2.5, 3.2, 4]} intensity={1.35} />
      <pointLight position={[-2.2, 1.2, 2]} intensity={12} color="#8ef6ff" distance={8} />
      {showGhost && <Figure levels={levels} selected={selected} ghost onSelect={onSelect} />}
      <Figure levels={levels} selected={selected} ghost={false} onSelect={onSelect} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.15, 0]}>
        <ringGeometry args={[0.55, 0.72, 40]} />
        <meshBasicMaterial color="#1d4d63" transparent opacity={0.8} />
      </mesh>
      <OrbitControls
        enablePan={false}
        minDistance={2.5}
        maxDistance={5.6}
        target={[0, 0.15, 0]}
        autoRotate={autoRotate}
        autoRotateSpeed={0.45}
      />
    </>
  );
}

export function BodyTwin({ levels }: { levels: Record<BodySystem, RiskLevel> }) {
  const selected = useMission((state) => state.system);
  const setSystem = useMission((state) => state.setSystem);
  const showGhost = useMission((state) => state.ghost);
  const reduceMotion = useReducedMotion();

  return (
    <div className="hud-frame flex flex-col">
      <div className="flex items-center justify-between px-4 py-1.5">
        <p className="font-mono text-xs tracking-[0.18em] text-[#9ad7ea]">BODY TWIN</p>
        <p className="text-xs text-[#d5e7f4]">{showGhost ? "Ghost shows the baseline silhouette" : "Baseline ghost hidden"}</p>
      </div>
      <div className="h-[clamp(15rem,calc(100dvh-20rem),28.75rem)]">
        <Canvas
          camera={{ position: [1.7, 0.7, 3.35], fov: 32 }}
          dpr={[1, 1.75]}
          onCreated={({ gl }) => {
            gl.domElement.setAttribute("role", "img");
            gl.domElement.setAttribute("aria-label", "Simulated astronaut body twin");
          }}
        >
          <Scene
            levels={levels}
            selected={selected}
            showGhost={showGhost}
            onSelect={setSystem}
            autoRotate={!reduceMotion}
          />
        </Canvas>
      </div>
      <div className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3">
        {SYSTEMS.map((system) => {
          const Icon = ICONS[system];
          const chip = levelChip(levels[system]);
          const active = selected === system;
          return (
            <button
              key={system}
              type="button"
              aria-pressed={active}
              onClick={() => setSystem(system)}
              className={`system-button flex items-center gap-2 rounded-md border px-2 py-1.5 text-left ${active ? "border-[#8ef6ff]" : "border-[#245066]"}`}
            >
              <Icon aria-hidden="true" className="size-4 shrink-0 text-[#8ef6ff]" />
              <span className="min-w-0">
                <span className="block truncate text-sm">{SYSTEM_LABEL[system].short}</span>
                <span className={`mt-1 inline-block rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${chip.className}`}>
                  {chip.label}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
