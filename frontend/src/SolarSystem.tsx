import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, useTexture } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";

/** 행성 정의 — 크기·궤도·속도는 보기 좋게 압축한 연출용 값(실제 비율 아님). */
type PlanetDef = {
  key: string;
  name: string;
  size: number;
  orbit: number;
  speed: number; // 공전 각속도(상대)
  spin: number; // 자전(상대)
  phase: number; // 시작 각도
  tex?: string; // 텍스처 키(없으면 color 사용)
  color?: string;
  ring?: boolean;
  moon?: boolean;
};

const PLANETS: PlanetDef[] = [
  { key: "mercury", name: "수성", size: 0.3, orbit: 4.6, speed: 1.6, spin: 3, phase: 0.5, tex: "mercury" },
  { key: "venus", name: "금성", size: 0.46, orbit: 6.3, speed: 1.18, spin: -2, phase: 2.1, tex: "venus" },
  { key: "earth", name: "지구", size: 0.5, orbit: 8.2, speed: 1.0, spin: 6, phase: 4.0, tex: "earth", moon: true },
  { key: "mars", name: "화성", size: 0.38, orbit: 10.2, speed: 0.8, spin: 6, phase: 1.0, tex: "mars" },
  { key: "jupiter", name: "목성", size: 1.25, orbit: 13.8, speed: 0.43, spin: 12, phase: 3.3, tex: "jupiter" },
  { key: "saturn", name: "토성", size: 1.05, orbit: 18.0, speed: 0.32, spin: 11, phase: 5.2, tex: "saturn", ring: true },
  { key: "uranus", name: "천왕성", size: 0.82, orbit: 21.8, speed: 0.22, spin: 7, phase: 0.2, tex: "uranus" },
  { key: "neptune", name: "해왕성", size: 0.8, orbit: 25.0, speed: 0.18, spin: 7, phase: 2.6, tex: "neptune" },
  { key: "pluto", name: "명왕성", size: 0.26, orbit: 28.0, speed: 0.14, spin: 4, phase: 4.6, color: "#c9b7a3" },
];

/** 부드러운 방사형 글로우 텍스처 (태양 코로나용) */
function useGlow() {
  return useMemo(() => {
    const s = 128;
    const c = document.createElement("canvas");
    c.width = c.height = s;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0.0, "rgba(255,255,255,1)");
    g.addColorStop(0.3, "rgba(255,240,200,0.55)");
    g.addColorStop(0.7, "rgba(255,180,80,0.12)");
    g.addColorStop(1.0, "rgba(255,180,80,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    return new THREE.CanvasTexture(c);
  }, []);
}

function OrbitRing({ radius }: { radius: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - 0.015, radius + 0.015, 128]} />
      <meshBasicMaterial color="#6072a8" transparent opacity={0.22} side={THREE.DoubleSide} />
    </mesh>
  );
}

/** 토성 고리 — RingGeometry UV 를 반지름 방향으로 재매핑해 고리 텍스처(반경 프로파일)를 입힌다. */
function SaturnRing({ inner, outer, map }: { inner: number; outer: number; map: THREE.Texture }) {
  const geo = useMemo(() => {
    const g = new THREE.RingGeometry(inner, outer, 96);
    const pos = g.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const t = (v.length() - inner) / (outer - inner);
      g.attributes.uv.setXY(i, t, 0.5);
    }
    return g;
  }, [inner, outer]);
  return (
    <mesh geometry={geo} rotation={[-Math.PI / 2 + 0.15, 0, 0]}>
      <meshBasicMaterial map={map} transparent side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

function Planet({
  data,
  map,
  ringMap,
  moonMap,
  onHover,
}: {
  data: PlanetDef;
  map?: THREE.Texture;
  ringMap?: THREE.Texture;
  moonMap?: THREE.Texture;
  onHover: (n: string | null) => void;
}) {
  const orbit = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const moon = useRef<THREE.Group>(null);

  useFrame((state, dt) => {
    const t = state.clock.getElapsedTime();
    if (orbit.current) {
      const a = t * data.speed + data.phase;
      orbit.current.position.set(Math.cos(a) * data.orbit, 0, Math.sin(a) * data.orbit);
    }
    if (body.current) body.current.rotation.y += dt * data.spin * 0.15;
    if (moon.current) moon.current.rotation.y = t * 1.6;
  });

  return (
    <>
      <OrbitRing radius={data.orbit} />
      <group ref={orbit}>
        <mesh
          ref={body}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHover(data.name);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            onHover(null);
            document.body.style.cursor = "auto";
          }}
        >
          <sphereGeometry args={[data.size, 48, 48]} />
          <meshStandardMaterial
            map={map}
            color={map ? "#ffffff" : data.color ?? "#cccccc"}
            roughness={1}
            metalness={0}
          />
        </mesh>

        {data.ring && ringMap && (
          <SaturnRing inner={data.size * 1.35} outer={data.size * 2.3} map={ringMap} />
        )}

        {data.moon && moonMap && (
          <group ref={moon}>
            <mesh position={[data.size + 0.55, 0, 0]}>
              <sphereGeometry args={[0.14, 24, 24]} />
              <meshStandardMaterial map={moonMap} roughness={1} metalness={0} />
            </mesh>
          </group>
        )}
      </group>
    </>
  );
}

function Sun({ map, glow }: { map: THREE.Texture; glow: THREE.Texture }) {
  const sun = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (sun.current) sun.current.rotation.y += dt * 0.03;
  });
  return (
    <group>
      <pointLight position={[0, 0, 0]} intensity={2.8} decay={0} color="#fff4de" />
      <mesh ref={sun}>
        <sphereGeometry args={[2.6, 64, 64]} />
        <meshBasicMaterial map={map} toneMapped={false} />
      </mesh>
      <sprite scale={[16, 16, 1]}>
        <spriteMaterial
          map={glow}
          color="#ff9a2e"
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>
    </group>
  );
}

function Scene({ onHover }: { onHover: (n: string | null) => void }) {
  const glow = useGlow();
  const tex = useTexture({
    sun: "/sun_map.jpg",
    mercury: "/2k_mercury.jpg",
    venus: "/2k_venus.jpg",
    earth: "/earth_map.jpg",
    moon: "/2k_moon.jpg",
    mars: "/2k_mars.jpg",
    jupiter: "/2k_jupiter.jpg",
    saturn: "/2k_saturn.jpg",
    saturnRing: "/2k_saturn_ring.png",
    uranus: "/2k_uranus.jpg",
    neptune: "/2k_neptune.jpg",
  }) as Record<string, THREE.Texture>;

  return (
    <>
      <ambientLight intensity={0.14} />
      <Stars radius={260} depth={70} count={4000} factor={3.5} fade speed={0.5} />
      <Sun map={tex.sun} glow={glow} />
      {PLANETS.map((p) => (
        <Planet
          key={p.key}
          data={p}
          map={p.tex ? tex[p.tex] : undefined}
          ringMap={p.ring ? tex.saturnRing : undefined}
          moonMap={p.moon ? tex.moon : undefined}
          onHover={onHover}
        />
      ))}
      <OrbitControls autoRotate autoRotateSpeed={0.15} enablePan enableZoom />
      {/* multisampling=0: 포스트프로세싱 기본 MSAA(8배) 제거 → 풀스크린 프레임 안정 */}
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.7} luminanceThreshold={0.2} luminanceSmoothing={0.9} mipmapBlur />
      </EffectComposer>
    </>
  );
}

export default function SolarSystem({ fullscreen = false }: { fullscreen?: boolean }) {
  const [hover, setHover] = useState<string | null>(null);
  return (
    <div
      className="stage"
      style={
        fullscreen
          ? { position: "fixed", inset: 0, zIndex: 0, border: "none", borderRadius: 0 }
          : undefined
      }
    >
      {/* 박스 모드에서만 좌상단 타이틀(전체화면은 상단 탭이 라벨 역할) */}
      {!fullscreen && (
        <div className="overlay" style={{ top: 16, left: 18 }}>
          <div className="title">태양계</div>
          <div className="muted" style={{ fontSize: 12 }}>
            태양을 중심으로 수성·금성·지구(달)·화성·목성·토성·천왕성·해왕성·명왕성이 공전 · 드래그 회전 · 휠 줌
          </div>
        </div>
      )}

      {hover && (
        <div
          className="overlay"
          style={fullscreen ? { bottom: 58, left: 22 } : { top: 16, right: 18, textAlign: "right" }}
        >
          <div style={{ fontWeight: 600, fontSize: 18 }}>{hover}</div>
        </div>
      )}

      <div className="overlay" style={{ bottom: 16, right: 18, textAlign: "right" }}>
        <div className="muted" style={{ fontSize: 11 }}>드래그 회전 · 휠 줌 · 행성 호버 시 이름</div>
        <div className="muted" style={{ fontSize: 10, opacity: 0.55, marginTop: 2 }}>
          행성 텍스처 © Solar System Scope (CC BY 4.0)
        </div>
      </div>

      <Canvas
        dpr={[1, 1.5]} /* 고DPI 화면에서 과도한 픽셀 렌더 방지 */
        gl={{ antialias: true, powerPreference: "high-performance" }}
        style={{ height: fullscreen ? "100%" : 620, background: "#02030a" }}
        camera={{ position: [0, 24, 46], fov: 52 }}
      >
        <Suspense fallback={null}>
          <Scene onHover={setHover} />
        </Suspense>
      </Canvas>
    </div>
  );
}
