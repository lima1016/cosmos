import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sparkles, Stars, useTexture } from "@react-three/drei";
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
  const color = tempColor(s.stellarTeffK);
  return (
    <group
      position={pos}
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
      {/* 온도색 헤일로 */}
      <sprite scale={[size, size, 1]}>
        <spriteMaterial
          map={glow}
          color={color}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>
      {/* 밝은 흰색 코어 → 또렷한 별 느낌 */}
      <sprite scale={[size * 0.42, size * 0.42, 1]}>
        <spriteMaterial
          map={glow}
          color="#ffffff"
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>
    </group>
  );
}

/** 태양(표면+코로나) + 지구(참고 마커, 비축척) */
function SunAndEarth({ glow }: { glow: THREE.Texture }) {
  // 실제 위성/태양 표면 전개도(equirectangular) 텍스처. Solar System Scope, CC BY 4.0.
  const [sunTex, earthTex, cloudsTex, nightTex] = useTexture([
    "/sun_map.jpg",
    "/earth_map.jpg",
    "/earth_clouds.jpg",
    "/earth_night.jpg",
  ]);
  const sun = useRef<THREE.Mesh>(null);
  const orbit = useRef<THREE.Group>(null);
  const earth = useRef<THREE.Mesh>(null);
  const clouds = useRef<THREE.Mesh>(null);

  useFrame((_, dt) => {
    if (sun.current) sun.current.rotation.y += dt * 0.04;
    if (orbit.current) orbit.current.rotation.y += dt * 0.12;
    if (earth.current) earth.current.rotation.y += dt * 0.5;
    if (clouds.current) clouds.current.rotation.y += dt * 0.65; // 구름은 약간 더 빠르게
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
        {/* 지표(주간) + 야경(도시 불빛 emissive) */}
        <mesh ref={earth} position={[9, 0, 0]}>
          <sphereGeometry args={[0.62, 48, 48]} />
          <meshStandardMaterial
            map={earthTex}
            emissiveMap={nightTex}
            emissive="#fff0cc"
            emissiveIntensity={0.55}
            roughness={1}
            metalness={0}
          />
        </mesh>
        {/* 구름 레이어(살짝 큰 반투명 구) */}
        <mesh ref={clouds} position={[9, 0, 0]}>
          <sphereGeometry args={[0.64, 48, 48]} />
          <meshStandardMaterial
            alphaMap={cloudsTex}
            transparent
            opacity={0.85}
            depthWrite={false}
            color="#ffffff"
            roughness={1}
            metalness={0}
          />
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
  stars,
  onSelect,
  onHover,
}: {
  stars: StarPosition[];
  onSelect: (h: string) => void;
  onHover: (s: StarPosition | null) => void;
}) {
  const glow = useGlow();

  return (
    <>
      <ambientLight intensity={0.12} />
      <Stars radius={340} depth={80} count={3500} factor={3} fade speed={0.6} />
      <Sparkles count={80} scale={200} size={1.5} speed={0.15} color="#9fb4ff" opacity={0.5} />
      <Suspense fallback={null}>
        <SunAndEarth glow={glow} />
      </Suspense>
      {stars.map((s) => (
        <Star key={s.hostname} s={s} glow={glow} onHover={onHover} onSelect={onSelect} />
      ))}
      <OrbitControls autoRotate autoRotateSpeed={0.25} enablePan enableZoom />
      <EffectComposer multisampling={0}>
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
  const [allStars, setAllStars] = useState<StarPosition[]>([]);
  const [maxDist, setMaxDist] = useState<number | null>(null); // 슬라이더 값(pc). null=미설정

  useEffect(() => {
    api.starMap().then(setAllStars).catch(() => {});
  }, []);

  // 로드된 별들의 거리 범위. 슬라이더 초기값은 최댓값(=전부 표시).
  const maxAvailable = useMemo(
    () => (allStars.length ? Math.ceil(Math.max(...allStars.map((s) => s.distancePc))) : 0),
    [allStars]
  );
  const limit = maxDist ?? maxAvailable;
  const shown = useMemo(
    () => allStars.filter((s) => s.distancePc <= limit),
    [allStars, limit]
  );

  return (
    <div className="stage">
      <div className="overlay" style={{ top: 16, left: 18 }}>
        <div className="title">3D 성도</div>
        <div className="muted" style={{ fontSize: 12 }}>
          드래그 회전 · 휠 줌 · 별 클릭 시 항성계 상세 · 가운데 태양·지구
        </div>
        <div className="muted" style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>
          태양·지구 텍스처 © Solar System Scope (CC BY 4.0)
        </div>
        {maxAvailable > 0 && (
          // overlay 자체는 pointer-events:none 이므로 슬라이더만 auto 로 되살린다.
          <div style={{ marginTop: 10, pointerEvents: "auto" }}>
            <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
              거리 {Math.round(limit)} pc 이내 · 별 {shown.length} / {allStars.length}개
            </div>
            <input
              type="range"
              min={1}
              max={maxAvailable}
              value={limit}
              onChange={(e) => setMaxDist(Number(e.target.value))}
              style={{ width: 220 }}
            />
          </div>
        )}
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
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        style={{ height: 600, background: "#03050d" }}
        camera={{ position: [0, 26, 92], fov: 60 }}
      >
        <Scene stars={shown} onSelect={onSelect} onHover={setHover} />
      </Canvas>
    </div>
  );
}
