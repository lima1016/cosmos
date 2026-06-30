import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sparkles, Stars } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";
import { api, StarPosition } from "./api";

const SCALE = 4;

/** 항성 유효온도(K) → 색 */
function tempColor(teff: number | null): string {
  if (!teff) return "#fff3e0";
  if (teff >= 10000) return "#a7c0ff";
  if (teff >= 7500) return "#cdd8ff";
  if (teff >= 6000) return "#fbf6ef";
  if (teff >= 5200) return "#fff0d6";
  if (teff >= 4000) return "#ffd9a8";
  return "#ff9d5c";
}

function toXYZ(s: StarPosition): [number, number, number] {
  const raR = (s.ra * Math.PI) / 180;
  const decR = (s.dec * Math.PI) / 180;
  const r = Math.sqrt(s.distancePc) * SCALE;
  return [
    r * Math.cos(decR) * Math.cos(raR),
    r * Math.sin(decR),
    r * Math.cos(decR) * Math.sin(raR),
  ];
}

/** 부드러운 방사형 글로우 텍스처 (별·코로나·대기용) */
function useGlow() {
  return useMemo(() => {
    const s = 128;
    const c = document.createElement("canvas");
    c.width = c.height = s;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0.0, "rgba(255,255,255,1)");
    g.addColorStop(0.16, "rgba(255,255,255,0.9)");
    g.addColorStop(0.35, "rgba(255,255,255,0.32)");
    g.addColorStop(0.7, "rgba(255,255,255,0.06)");
    g.addColorStop(1.0, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    return new THREE.CanvasTexture(c);
  }, []);
}

/** 태양 표면 텍스처 (오렌지 + 입상 반점) */
function useSunTexture() {
  return useMemo(() => {
    const w = 512, h = 256;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ff7a12";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 1600; i++) {
      const x = Math.random() * w, y = Math.random() * h, r = 2 + Math.random() * 7;
      const bright = Math.random() > 0.5;
      ctx.fillStyle = bright
        ? `rgba(255,214,128,${0.25 + Math.random() * 0.4})`
        : `rgba(188,70,8,${0.2 + Math.random() * 0.35})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    return new THREE.CanvasTexture(c);
  }, []);
}

/** 지구 텍스처 (바다 + 대륙 + 극관) */
function useEarthTexture() {
  return useMemo(() => {
    const w = 512, h = 256;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#0a2a5e");
    g.addColorStop(0.5, "#1457a8");
    g.addColorStop(1, "#0a2a5e");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 28; i++) {
      const x = Math.random() * w, y = 28 + Math.random() * (h - 56), r = 10 + Math.random() * 38;
      ctx.fillStyle = Math.random() > 0.4 ? "#2f7d36" : "#6b5a32";
      for (let j = 0; j < 5; j++) {
        ctx.beginPath();
        ctx.arc(
          x + (Math.random() - 0.5) * r * 2,
          y + (Math.random() - 0.5) * r * 1.4,
          r * (0.4 + Math.random() * 0.6),
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillRect(0, 0, w, 14);
    ctx.fillRect(0, h - 14, w, 14);
    return new THREE.CanvasTexture(c);
  }, []);
}

function Star({
  s,
  glow,
  onHover,
  onSelect,
}: {
  s: StarPosition;
  glow: THREE.Texture;
  onHover: (s: StarPosition | null) => void;
  onSelect: (hostname: string) => void;
}) {
  const pos = useMemo(() => toXYZ(s), [s]);
  const size = Math.min(2.6 + (s.planetCount - 1) * 0.7, 6);
  return (
    <sprite
      position={pos}
      scale={[size, size, 1]}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(s);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        onHover(null);
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(s.hostname);
      }}
    >
      <spriteMaterial
        map={glow}
        color={tempColor(s.stellarTeffK)}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </sprite>
  );
}

/** 태양(표면+코로나) + 지구(참고 마커, 비축척) */
function SunAndEarth({ glow }: { glow: THREE.Texture }) {
  const sunTex = useSunTexture();
  const earthTex = useEarthTexture();
  const sun = useRef<THREE.Mesh>(null);
  const orbit = useRef<THREE.Group>(null);
  const earth = useRef<THREE.Mesh>(null);

  useFrame((_, dt) => {
    if (sun.current) sun.current.rotation.y += dt * 0.04;
    if (orbit.current) orbit.current.rotation.y += dt * 0.12;
    if (earth.current) earth.current.rotation.y += dt * 0.5;
  });

  return (
    <group>
      {/* 태양에서 나오는 빛 → 지구에 낮/밤 */}
      <pointLight position={[0, 0, 0]} intensity={2.6} decay={0} color="#fff3da" />

      {/* 태양 표면 */}
      <mesh ref={sun}>
        <sphereGeometry args={[2.6, 48, 48]} />
        <meshBasicMaterial map={sunTex} toneMapped={false} />
      </mesh>
      {/* 코로나 글로우 */}
      <sprite scale={[13, 13, 1]}>
        <spriteMaterial map={glow} color="#ff8a1e" transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <sprite scale={[6, 6, 1]}>
        <spriteMaterial map={glow} color="#fff2d0" transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>

      {/* 지구 */}
      <group ref={orbit}>
        <mesh ref={earth} position={[9, 0, 0]}>
          <sphereGeometry args={[0.62, 32, 32]} />
          <meshStandardMaterial map={earthTex} roughness={1} metalness={0} />
        </mesh>
        {/* 대기 */}
        <sprite position={[9, 0, 0]} scale={[1.9, 1.9, 1]}>
          <spriteMaterial map={glow} color="#6ea8ff" transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      </group>
    </group>
  );
}

function Scene({
  onSelect,
  onHover,
}: {
  onSelect: (h: string) => void;
  onHover: (s: StarPosition | null) => void;
}) {
  const glow = useGlow();
  const [stars, setStars] = useState<StarPosition[]>([]);

  useEffect(() => {
    api.starMap().then(setStars).catch(() => {});
  }, []);

  return (
    <>
      <ambientLight intensity={0.12} />
      <Stars radius={340} depth={80} count={3500} factor={3} fade speed={0.6} />
      <Sparkles count={80} scale={200} size={1.5} speed={0.15} color="#9fb4ff" opacity={0.5} />
      <SunAndEarth glow={glow} />
      {stars.map((s) => (
        <Star key={s.hostname} s={s} glow={glow} onHover={onHover} onSelect={onSelect} />
      ))}
      <OrbitControls autoRotate autoRotateSpeed={0.25} enablePan enableZoom />
      <EffectComposer>
        <Bloom intensity={0.6} luminanceThreshold={0.12} luminanceSmoothing={0.9} mipmapBlur />
      </EffectComposer>
    </>
  );
}

export default function SpaceView({
  onSelect,
}: {
  onSelect: (hostname: string) => void;
}) {
  const [hover, setHover] = useState<StarPosition | null>(null);

  return (
    <div className="stage">
      <div className="overlay" style={{ top: 16, left: 18 }}>
        <div className="title">3D 성도</div>
        <div className="muted" style={{ fontSize: 12 }}>
          드래그 회전 · 휠 줌 · 별 클릭 시 항성계 상세 · 가운데 태양·지구
        </div>
      </div>

      {hover && (
        <div className="overlay" style={{ top: 16, right: 18, textAlign: "right" }}>
          <div style={{ fontWeight: 600 }}>{hover.hostname}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            {hover.distancePc.toFixed(1)} pc · 행성 {hover.planetCount}
            {hover.stellarTeffK ? ` · ${Math.round(hover.stellarTeffK)} K` : ""}
          </div>
        </div>
      )}

      <Canvas
        style={{ height: 600, background: "#03050d" }}
        camera={{ position: [0, 26, 92], fov: 60 }}
      >
        <Scene onSelect={onSelect} onHover={setHover} />
      </Canvas>
    </div>
  );
}
