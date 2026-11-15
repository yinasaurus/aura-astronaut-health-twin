import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import { Bone, Brain, Eye, HeartPulse, Moon, Shield } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import * as THREE from "three";
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

const LEVEL_COLOR: Record<RiskLevel, string> = {
  green: "#3ee0a6",
  amber: "#ffb020",
  red: "#ff4d67",
};

type LayerId = "skin" | "skeleton" | "organs";

const LAYERS: { id: LayerId; label: string }[] = [
  { id: "skin", label: "Skin" },
  { id: "skeleton", label: "Skeleton" },
  { id: "organs", label: "Organs" },
];

const GROUP_Y = -1.02;

const ANCHOR: Record<BodySystem, [number, number, number]> = {
  cardiovascular: [0.03, 1.12, 0.1],
  musculoskeletal: [0, 0.95, 0],
  brain: [0, 1.58, 0],
  sleep: [0, 1.58, 0],
  immune: [0, 1.05, 0.08],
  vision: [0, 1.55, 0.13],
};

const shellMaterial = new THREE.MeshPhysicalMaterial({
  color: "#e7f8ff",
  emissive: "#14627a",
  emissiveIntensity: 0.85,
  metalness: 0.08,
  roughness: 0.16,
  clearcoat: 0.85,
  clearcoatRoughness: 0.2,
  transparent: true,
  opacity: 0.38,
  depthWrite: false,
  side: THREE.FrontSide,
});

const rimMaterial = new THREE.MeshBasicMaterial({
  color: "#9aefff",
  transparent: true,
  opacity: 0.62,
  depthWrite: false,
  side: THREE.BackSide,
  toneMapped: false,
});

const ghostGlassMaterial = new THREE.MeshBasicMaterial({
  color: "#e9fff8",
  transparent: true,
  opacity: 0.14,
  depthWrite: false,
  side: THREE.BackSide,
});

const torsoGeometry = new THREE.LatheGeometry(
  [
    [0.04, 0.58],
    [0.14, 0.66],
    [0.2, 0.78],
    [0.16, 0.96],
    [0.2, 1.1],
    [0.26, 1.24],
    [0.3, 1.34],
    [0.14, 1.42],
    [0.07, 1.5],
  ].map(([x, y]) => new THREE.Vector2(x, y)),
  48,
);

function heartShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.16);
  shape.bezierCurveTo(0.02, 0.42, -0.46, 0.4, -0.42, 0.12);
  shape.bezierCurveTo(-0.4, -0.08, -0.12, -0.16, 0, -0.46);
  shape.bezierCurveTo(0.12, -0.16, 0.4, -0.08, 0.42, 0.12);
  shape.bezierCurveTo(0.46, 0.4, -0.02, 0.42, 0, 0.16);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.22,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.05,
    bevelSegments: 4,
    curveSegments: 20,
  });
  geometry.center();
  return geometry;
}

const heartGeo = heartShape();

function limb(from: [number, number, number], to: [number, number, number], radius: number) {
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);
  const direction = end.clone().sub(start);
  const distance = direction.length();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  const position = start.clone().add(end).multiplyScalar(0.5);
  return {
    position: [position.x, position.y, position.z] as [number, number, number],
    quaternion,
    args: [radius, Math.max(0.05, distance - radius * 2), 5, 10] as [number, number, number, number],
  };
}

const LIMBS = {
  armL: limb([-0.28, 1.32, 0.02], [-0.46, 0.96, 0.05], 0.048),
  forearmL: limb([-0.46, 0.96, 0.05], [-0.38, 0.64, 0.1], 0.038),
  armR: limb([0.28, 1.32, 0.02], [0.46, 0.96, 0.05], 0.048),
  forearmR: limb([0.46, 0.96, 0.05], [0.38, 0.64, 0.1], 0.038),
  thighL: limb([-0.1, 0.72, 0.01], [-0.12, 0.36, 0.02], 0.062),
  shinL: limb([-0.12, 0.36, 0.02], [-0.11, 0.02, 0.04], 0.046),
  thighR: limb([0.1, 0.72, 0.01], [0.12, 0.36, 0.02], 0.062),
  shinR: limb([0.12, 0.36, 0.02], [0.11, 0.02, 0.04], 0.046),
};

const LIMB_BONES = Object.values(LIMBS).map((part) => ({
  position: part.position,
  quaternion: part.quaternion,
  length: part.args[1],
}));

function ribGeometry(y: number, radius: number) {
  const points: THREE.Vector3[] = [];
  for (let step = 0; step <= 18; step += 1) {
    const angle = -Math.PI * 0.72 + (Math.PI * 1.44 * step) / 18;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, y + Math.sin(angle) * 0.02, Math.sin(angle) * radius * 0.72));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 18, 0.011, 5, false);
}

const RIBS = [1.2, 1.1, 1.0, 0.9].map((y, index) => ribGeometry(y, 0.155 - index * 0.01));

const spineGeometry = new THREE.TubeGeometry(
  new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.58, -0.02),
    new THREE.Vector3(0, 0.86, -0.04),
    new THREE.Vector3(0.01, 1.16, -0.03),
    new THREE.Vector3(0, 1.4, 0),
  ]),
  16,
  0.016,
  5,
  false,
);

function stopSelect(system: BodySystem, onSelect: (system: BodySystem) => void) {
  return (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect(system);
  };
}

function ShellMesh({
  position,
  rotation,
  quaternion,
  scale,
  children,
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  quaternion?: THREE.Quaternion;
  scale?: [number, number, number];
  children: ReactNode;
}) {
  return (
    <mesh position={position} rotation={rotation} quaternion={quaternion} scale={scale} renderOrder={2} raycast={() => null}>
      {children}
      <primitive object={shellMaterial} attach="material" dispose={null} />
      <mesh scale={1.018} renderOrder={3} raycast={() => null}>
        {children}
        <primitive object={rimMaterial} attach="material" dispose={null} />
      </mesh>
    </mesh>
  );
}

function HologramShell() {
  return (
    <group>
      <ShellMesh>
        <primitive object={torsoGeometry} attach="geometry" dispose={null} />
      </ShellMesh>
      <ShellMesh position={[0, 1.58, 0]} scale={[0.9, 1.08, 0.94]}>
        <sphereGeometry args={[0.145, 32, 24]} />
      </ShellMesh>
      <ShellMesh position={[0, 1.4, 0.01]}>
        <capsuleGeometry args={[0.055, 0.1, 4, 12]} />
      </ShellMesh>
      <ShellMesh position={[0, 1.54, 0.13]} scale={[0.7, 0.75, 0.75]}>
        <sphereGeometry args={[0.03, 12, 10]} />
      </ShellMesh>
      <ShellMesh position={[-0.13, 1.57, 0]} scale={[0.4, 0.7, 0.45]}>
        <sphereGeometry args={[0.05, 12, 10]} />
      </ShellMesh>
      <ShellMesh position={[0.13, 1.57, 0]} scale={[0.4, 0.7, 0.45]}>
        <sphereGeometry args={[0.05, 12, 10]} />
      </ShellMesh>
      {Object.values(LIMBS).map((part) => (
        <ShellMesh key={part.position.join(",")} position={part.position} quaternion={part.quaternion}>
          <capsuleGeometry args={part.args} />
        </ShellMesh>
      ))}
    </group>
  );
}

function GhostShell() {
  return (
    <group scale={1.045} raycast={() => null}>
      <mesh renderOrder={1}>
        <primitive object={torsoGeometry} attach="geometry" dispose={null} />
        <primitive object={ghostGlassMaterial} attach="material" dispose={null} />
      </mesh>
      <mesh position={[0, 1.58, 0]} scale={[0.9, 1.08, 0.94]} renderOrder={1}>
        <sphereGeometry args={[0.145, 24, 18]} />
        <primitive object={ghostGlassMaterial} attach="material" dispose={null} />
      </mesh>
      {Object.values(LIMBS).map((part) => (
        <mesh key={`ghost-${part.position.join(",")}`} position={part.position} quaternion={part.quaternion} renderOrder={1}>
          <capsuleGeometry args={part.args} />
          <primitive object={ghostGlassMaterial} attach="material" dispose={null} />
        </mesh>
      ))}
    </group>
  );
}

function OrganMaterial({ level, selected, amount = 1 }: { level: RiskLevel; selected: boolean; amount?: number }) {
  const quiet = level === "green" ? 0.5 : 1;
  return (
    <meshStandardMaterial
      color="#102433"
      emissive={LEVEL_COLOR[level]}
      emissiveIntensity={(selected ? 1.45 : quiet) * amount}
      roughness={0.42}
      metalness={0.06}
    />
  );
}

function SelectionWire({ selected, level, children }: { selected: boolean; level: RiskLevel; children: ReactNode }) {
  if (!selected) return null;
  return (
    <mesh scale={1.12} raycast={() => null} renderOrder={4}>
      {children}
      <meshBasicMaterial color={LEVEL_COLOR[level]} transparent opacity={0.55} depthWrite={false} side={THREE.BackSide} />
    </mesh>
  );
}

function Heart({
  level,
  selected,
  bpm,
  reduced,
  onSelect,
}: {
  level: RiskLevel;
  selected: boolean;
  bpm: number;
  reduced: boolean;
  onSelect: (system: BodySystem) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const rate = (Math.max(42, bpm) / 60) * Math.PI * 2;
    const amount = reduced ? 0 : level === "green" ? 0.045 : 0.08;
    const scale = 1 + Math.sin(clock.elapsedTime * rate) * amount;
    ref.current.scale.setScalar(scale);
  });
  return (
    <group ref={ref} position={[0.015, 1.14, 0.14]} onClick={stopSelect("cardiovascular", onSelect)}>
      <mesh scale={0.28}>
        <primitive object={heartGeo} attach="geometry" dispose={null} />
        <OrganMaterial level={level} selected={selected} />
      </mesh>
      {selected && (
        <mesh scale={0.31} raycast={() => null}>
          <primitive object={heartGeo} attach="geometry" dispose={null} />
          <meshBasicMaterial color={LEVEL_COLOR[level]} transparent opacity={0.28} depthWrite={false} side={THREE.BackSide} />
        </mesh>
      )}
    </group>
  );
}

function BrainLobes({
  level,
  selected,
  onSelect,
}: {
  level: RiskLevel;
  selected: boolean;
  onSelect: (system: BodySystem) => void;
}) {
  return (
    <group position={[0, 1.58, 0]} onClick={stopSelect("brain", onSelect)}>
      <mesh position={[-0.045, 0.01, 0]} scale={[0.86, 1, 0.9]}>
        <sphereGeometry args={[0.085, 18, 14]} />
        <OrganMaterial level={level} selected={selected} />
      </mesh>
      <mesh position={[0.045, 0.01, 0]} scale={[0.86, 1, 0.9]}>
        <sphereGeometry args={[0.085, 18, 14]} />
        <OrganMaterial level={level} selected={selected} />
      </mesh>
      <mesh position={[0, -0.05, -0.01]} scale={[1.1, 0.5, 0.75]}>
        <sphereGeometry args={[0.06, 14, 12]} />
        <OrganMaterial level={level} selected={selected} />
      </mesh>
      <SelectionWire selected={selected} level={level}>
        <sphereGeometry args={[0.12, 16, 12]} />
      </SelectionWire>
    </group>
  );
}

function SleepGlow({
  level,
  selected,
  reduced,
  onSelect,
}: {
  level: RiskLevel;
  selected: boolean;
  reduced: boolean;
  onSelect: (system: BodySystem) => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const amount = reduced ? 0 : 0.08;
    const scale = 1 + Math.sin(clock.elapsedTime * 1.35) * amount;
    ref.current.scale.setScalar(scale);
  });
  return (
    <mesh ref={ref} position={[0, 1.58, 0]} onClick={stopSelect("sleep", onSelect)}>
      <sphereGeometry args={[0.2, 24, 18]} />
      <meshBasicMaterial color={LEVEL_COLOR[level]} transparent opacity={selected ? 0.2 : 0.08} depthWrite={false} />
    </mesh>
  );
}

function Eyes({
  level,
  selected,
  onSelect,
}: {
  level: RiskLevel;
  selected: boolean;
  onSelect: (system: BodySystem) => void;
}) {
  return (
    <group onClick={stopSelect("vision", onSelect)}>
      {[ -0.07, 0.07 ].map((x) => (
        <group key={x} position={[x, 1.55, 0.13]}>
          <mesh scale={[1, 0.72, 0.5]}>
            <sphereGeometry args={[0.045, 14, 12]} />
            <OrganMaterial level={level} selected={selected} />
          </mesh>
          <mesh position={[0, 0, 0.02]} raycast={() => null}>
            <sphereGeometry args={[0.016, 10, 8]} />
            <meshBasicMaterial color="#07111c" />
          </mesh>
          <SelectionWire selected={selected} level={level}>
            <sphereGeometry args={[0.05, 12, 10]} />
          </SelectionWire>
        </group>
      ))}
    </group>
  );
}

const NODES: [number, number, number, number][] = [
  [-0.07, 1.4, 0.06, 0.028],
  [0.07, 1.4, 0.06, 0.028],
  [-0.24, 1.16, 0.04, 0.032],
  [0.24, 1.16, 0.04, 0.032],
  [-0.09, 0.58, 0.08, 0.03],
  [0.09, 0.58, 0.08, 0.03],
  [-0.12, 0.96, 0.12, 0.05],
];

function ImmuneMarkers({
  level,
  selected,
  onSelect,
}: {
  level: RiskLevel;
  selected: boolean;
  onSelect: (system: BodySystem) => void;
}) {
  return (
    <group onClick={stopSelect("immune", onSelect)}>
      {NODES.map(([x, y, z, radius]) => (
        <mesh key={`${x},${y}`} position={[x, y, z]} scale={radius === 0.05 ? [1.3, 0.8, 0.7] : 1}>
          <sphereGeometry args={[radius, 12, 10]} />
          <OrganMaterial level={level} selected={selected} />
          <SelectionWire selected={selected} level={level}>
            <sphereGeometry args={[radius, 10, 8]} />
          </SelectionWire>
        </mesh>
      ))}
    </group>
  );
}

function Bones({
  level,
  selected,
  emphasized,
  onSelect,
}: {
  level: RiskLevel;
  selected: boolean;
  emphasized: boolean;
  onSelect: (system: BodySystem) => void;
}) {
  const amount = emphasized || selected ? 1 : 0.4;
  const click = stopSelect("musculoskeletal", onSelect);
  return (
    <group onClick={click}>
      <mesh>
        <primitive object={spineGeometry} attach="geometry" dispose={null} />
        <OrganMaterial level={level} selected={selected} amount={amount} />
      </mesh>
      {RIBS.map((geometry, index) => (
        <mesh key={index}>
          <primitive object={geometry} attach="geometry" dispose={null} />
          <OrganMaterial level={level} selected={selected} amount={amount} />
        </mesh>
      ))}
      <mesh position={[0, 0.62, 0]} rotation={[Math.PI / 2.15, 0, 0]}>
        <torusGeometry args={[0.13, 0.01, 6, 24, Math.PI * 1.25]} />
        <OrganMaterial level={level} selected={selected} amount={amount} />
      </mesh>
      {LIMB_BONES.map((bone) => (
        <mesh key={bone.position.join(",")} position={bone.position} quaternion={bone.quaternion}>
          <cylinderGeometry args={[0.011, 0.011, bone.length, 6]} />
          <OrganMaterial level={level} selected={selected} amount={amount} />
        </mesh>
      ))}
    </group>
  );
}

function Breath({ reduced, children }: { reduced: boolean; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const lift = reduced ? 0 : Math.sin(clock.elapsedTime * 1.35) * 0.012;
    ref.current.scale.set(1, 1 + lift, 1);
  });
  return (
    <group ref={ref} position={[0, GROUP_Y, 0]}>
      {children}
    </group>
  );
}

function CameraRig({
  selected,
  reduced,
  dragging,
  ease,
}: {
  selected: BodySystem;
  reduced: boolean;
  dragging: RefObject<boolean>;
  ease: RefObject<boolean>;
}) {
  const controls = useThree((state) => state.controls) as { target: THREE.Vector3; autoRotate: boolean } | null;
  const focus = useRef(new THREE.Vector3(0, 0.12, 0));
  useFrame((_, delta) => {
    if (!controls) return;
    controls.autoRotate = !reduced && !dragging.current;
    const anchor = ANCHOR[selected];
    const y = THREE.MathUtils.clamp(anchor[1] + GROUP_Y, -0.15, 0.22);
    focus.current.set(anchor[0] * 0.25, y, 0);
    if (!ease.current) return;
    const rate = reduced ? 1 : 1 - Math.exp(-delta * 3);
    controls.target.lerp(focus.current, rate);
  });
  return (
    <OrbitControls
      makeDefault
      enablePan={false}
      minDistance={3.1}
      maxDistance={6}
      target={[0, 0.02, 0]}
      autoRotate={!reduced}
      autoRotateSpeed={0.32}
      onStart={() => {
        dragging.current = true;
        ease.current = false;
      }}
      onEnd={() => {
        dragging.current = false;
      }}
    />
  );
}

function Scene({
  levels,
  selected,
  showGhost,
  layer,
  heartBpm,
  reduced,
  onSelect,
}: {
  levels: Record<BodySystem, RiskLevel>;
  selected: BodySystem;
  showGhost: boolean;
  layer: LayerId;
  heartBpm: number;
  reduced: boolean;
  onSelect: (system: BodySystem) => void;
}) {
  const dragging = useRef(false);
  const ease = useRef(true);
  useEffect(() => {
    ease.current = true;
  }, [selected]);
  useFrame(() => {
    const gain = layer === "skin" ? 1 : layer === "skeleton" ? 0.28 : 0.72;
    shellMaterial.opacity = 0.22 + gain * 0.22;
    rimMaterial.opacity = 0.18 + gain * 0.5;
  });
  const organs = layer === "organs";
  const showBones = layer !== "skin" || selected === "musculoskeletal";
  const show = (system: BodySystem) => selected === system || (organs && system !== "musculoskeletal");
  return (
    <>
      <color attach="background" args={["#07111c"]} />
      <ambientLight intensity={0.28} />
      <directionalLight position={[2.6, 3.6, 3.4]} intensity={1.55} color="#fff6ec" />
      <directionalLight position={[-2.8, 1.5, 2.4]} intensity={0.55} color="#9fd6ff" />
      <directionalLight position={[0.2, 1.8, -3.4]} intensity={1.15} color="#7eefff" />
      <Breath reduced={reduced}>
        <HologramShell />
        {showGhost && <GhostShell />}
        {showBones && (
          <Bones
            level={levels.musculoskeletal}
            selected={selected === "musculoskeletal"}
            emphasized={layer === "skeleton"}
            onSelect={onSelect}
          />
        )}
        {show("cardiovascular") && (
          <Heart level={levels.cardiovascular} selected={selected === "cardiovascular"} bpm={heartBpm} reduced={reduced} onSelect={onSelect} />
        )}
        {show("brain") && <BrainLobes level={levels.brain} selected={selected === "brain"} onSelect={onSelect} />}
        {show("sleep") && <SleepGlow level={levels.sleep} selected={selected === "sleep"} reduced={reduced} onSelect={onSelect} />}
        {show("vision") && <Eyes level={levels.vision} selected={selected === "vision"} onSelect={onSelect} />}
        {show("immune") && <ImmuneMarkers level={levels.immune} selected={selected === "immune"} onSelect={onSelect} />}
      </Breath>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.15, 0]} raycast={() => null}>
        <ringGeometry args={[0.55, 0.72, 40]} />
        <meshBasicMaterial color="#1d4d63" transparent opacity={0.8} />
      </mesh>
      <CameraRig selected={selected} reduced={reduced} dragging={dragging} ease={ease} />
    </>
  );
}

export function BodyTwin({ levels, heartBpm }: { levels: Record<BodySystem, RiskLevel>; heartBpm: number }) {
  const selected = useMission((state) => state.system);
  const setSystem = useMission((state) => state.setSystem);
  const showGhost = useMission((state) => state.ghost);
  const reduceMotion = useReducedMotion() === true;
  const [layer, setLayer] = useState<LayerId>("organs");
  const layerRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function moveLayer(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next = event.key === "ArrowRight" ? (index + 1) % LAYERS.length : (index - 1 + LAYERS.length) % LAYERS.length;
    setLayer(LAYERS[next].id);
    layerRefs.current[next]?.focus();
  }

  return (
    <div className="hud-frame flex flex-col">
      <div className="flex items-center justify-between px-4 py-1.5">
        <p className="font-mono text-xs tracking-[0.18em] text-[#9ad7ea]">BODY TWIN</p>
        <p className="text-xs text-[#d5e7f4]">{showGhost ? "Ghost shows the baseline silhouette" : "Baseline ghost hidden"}</p>
      </div>
      <div className="relative h-[clamp(15rem,calc(100dvh-20rem),28.75rem)]" data-testid="body-twin">
        <Canvas
          className="h-full w-full"
          camera={{ position: [1.05, 0.08, 3.35], fov: 30 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, powerPreference: "high-performance" }}
          onCreated={({ gl }) => {
            gl.domElement.setAttribute("role", "img");
            gl.domElement.setAttribute("aria-label", "Simulated astronaut body twin");
          }}
        >
          <Scene
            levels={levels}
            selected={selected}
            showGhost={showGhost}
            layer={layer}
            heartBpm={heartBpm}
            reduced={reduceMotion}
            onSelect={setSystem}
          />
        </Canvas>
        <div className="pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center">
          <div className="pointer-events-auto flex gap-1 rounded-md border border-[#245066] bg-[#07111c]/90 p-1" role="group" aria-label="Body layer">
            {LAYERS.map((item, index) => (
              <button
                key={item.id}
                ref={(node) => {
                  layerRefs.current[index] = node;
                }}
                type="button"
                className={`system-button rounded-md border px-2 py-1 text-xs ${layer === item.id ? "border-[#8ef6ff] bg-[#123246] text-[#8ef6ff]" : "border-[#245066]"}`}
                aria-pressed={layer === item.id}
                onClick={() => setLayer(item.id)}
                onKeyDown={(event) => moveLayer(event, index)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3">
        {SYSTEMS.map((system) => {
          const Icon = ICONS[system];
          const chip = levelChip(levels[system]);
          const active = selected === system;
          const flagged = SYSTEMS.find((item) => levels[item] !== "green");
          return (
            <button
              key={system}
              type="button"
              data-testid={system === flagged ? "flagged-system" : `system-${system}`}
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
