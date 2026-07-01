import { useMemo, useState } from "react";
import { NeoApproach } from "./api";

const R = 190; // 최대 반지름(px)
const GOLDEN = Math.PI * (3 - Math.sqrt(5)); // 황금각 → 점이 고르게 퍼지도록

function avgDiameter(n: NeoApproach): number | null {
  if (n.diameterMinKm == null || n.diameterMaxKm == null) return null;
  return (n.diameterMinKm + n.diameterMaxKm) / 2;
}

/** id → 안정적 시드 (같은 소행성은 항상 같은 모양) */
function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 시드 기반 난수 생성기(mulberry32) */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 울퉁불퉁한 소행성 실루엣 폴리곤 경로(중심 0,0) */
function rockPath(size: number, seed: number): string {
  const rnd = seeded(seed);
  const n = 8 + Math.floor(rnd() * 4); // 꼭짓점 8~11개
  let d = "";
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2;
    const rr = size * (0.68 + rnd() * 0.5); // 반지름 들쭉날쭉
    const x = Math.cos(ang) * rr;
    const y = Math.sin(ang) * rr;
    d += `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  return d + "Z";
}

/**
 * 근접 레이더 — 지구를 중심에 두고 소행성을 "지구와의 최소거리(달거리 LD)"로 배치.
 * 반지름 = 근접도(sqrt 스케일, 중심에 가까울수록 가깝게 지나감), 각도는 겹침 방지용(황금각).
 * 점 크기 = 지름, 빨강 = 잠재 위험 소행성.
 */
export default function NeoRadar({ rows }: { rows: NeoApproach[] }) {
  const [hover, setHover] = useState<NeoApproach | null>(null);

  const withDist = useMemo(
    () => rows.filter((r) => r.missDistanceLunar != null),
    [rows]
  );
  const maxLD = useMemo(
    () => Math.max(1, ...withDist.map((r) => r.missDistanceLunar as number)) * 1.05,
    [withDist]
  );
  const ringR = (ld: number) => R * Math.sqrt(ld / maxLD);

  const points = useMemo(
    () =>
      withDist.map((n, i) => {
        const rad = ringR(n.missDistanceLunar as number);
        const angle = i * GOLDEN;
        const d = avgDiameter(n);
        const size = d != null ? Math.max(3.5, Math.min(13, 3.5 + Math.sqrt(d) * 6)) : 4;
        const x = rad * Math.cos(angle);
        const y = rad * Math.sin(angle);
        const r = Math.hypot(x, y) || 1;
        const ux = x / r; // 바깥쪽(지구 반대) 단위벡터 → 등장 방향
        const uy = y / r;
        return {
          n,
          x,
          y,
          size,
          path: rockPath(size, hashId(n.id)),
          ux,
          uy,
          delay: Math.min(i * 0.02, 1.4), // 등장 스태거
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [withDist, maxLD]
  );

  const ticks = [1, 2, 5, 10, 20, 30, 50, 75, 100].filter((t) => t <= maxLD);
  if (ticks.length === 0) ticks.push(1);

  // 회전 스윕 빔의 부채꼴 경로(선단 +x축, 16° 트레일)
  const sweepRad = (-16 * Math.PI) / 180;
  const sweepPath = `M 0 0 L ${(R * Math.cos(sweepRad)).toFixed(1)} ${(
    R * Math.sin(sweepRad)
  ).toFixed(1)} A ${R} ${R} 0 0 1 ${R} 0 Z`;
  const hoverPoint = points.find((p) => p.n.id === hover?.id);

  return (
    <div className="stage" style={{ background: "#03050d" }}>
      {hover && (
        <div className="overlay" style={{ top: 14, right: 16, textAlign: "right" }}>
          <div style={{ fontWeight: 600 }}>{hover.name}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            {hover.closeApproachDate} · {hover.missDistanceLunar?.toFixed(1)} LD
            {hover.missDistanceKm != null
              ? ` (${Math.round(hover.missDistanceKm).toLocaleString()} km)`
              : ""}
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            {hover.relativeVelocityKmS != null ? `${hover.relativeVelocityKmS.toFixed(1)} km/s` : ""}
            {avgDiameter(hover) != null
              ? ` · ⌀ ${(avgDiameter(hover) as number).toFixed(3)} km`
              : ""}
            {hover.hazardous ? " · ⚠ 위험" : ""}
          </div>
        </div>
      )}

      <svg viewBox="-210 -210 420 420" style={{ width: "100%", height: 460, display: "block" }}>
        <defs>
          {/* 대기 글로우(가장자리 푸른 링) */}
          <radialGradient id="earthAtmo" cx="50%" cy="50%" r="50%">
            <stop offset="62%" stopColor="rgba(110,170,255,0)" />
            <stop offset="86%" stopColor="rgba(120,175,255,0.45)" />
            <stop offset="100%" stopColor="rgba(120,175,255,0)" />
          </radialGradient>
          <clipPath id="earthClip">
            <circle cx="0" cy="0" r="19" />
          </clipPath>
          {/*
            바위 표면: fractalNoise 를 굴곡(bump)으로 삼아 좌상단 광원으로 라이팅 →
            울퉁불퉁한 암석 질감. feComposite in 으로 폴리곤 모양에만 채운다.
          */}
          <filter id="rockSurf" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.22" numOctaves="3" seed="7" result="n" />
            <feDiffuseLighting in="n" surfaceScale="3.2" diffuseConstant="1.15" lightingColor="#d2c6ae" result="lit">
              <feDistantLight azimuth="235" elevation="52" />
            </feDiffuseLighting>
            <feComposite in="lit" in2="SourceGraphic" operator="in" />
          </filter>
          <filter id="rockSurfDanger" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.22" numOctaves="3" seed="7" result="n" />
            <feDiffuseLighting in="n" surfaceScale="3.2" diffuseConstant="1.2" lightingColor="#e8a892" result="lit">
              <feDistantLight azimuth="235" elevation="52" />
            </feDiffuseLighting>
            <feComposite in="lit" in2="SourceGraphic" operator="in" />
          </filter>
        </defs>

        {/* 거리 링 (달거리 LD) */}
        {ticks.map((t) => (
          <g key={t}>
            <circle
              cx={0}
              cy={0}
              r={ringR(t)}
              fill="none"
              stroke={t === 1 ? "rgba(150,180,255,0.55)" : "rgba(255,255,255,0.1)"}
              strokeDasharray={t === 1 ? "4 4" : undefined}
            />
            <text
              x={0}
              y={-ringR(t) - 3}
              textAnchor="middle"
              fontSize={9}
              fill={t === 1 ? "#9fb4ff" : "#6b7590"}
            >
              {t === 1 ? "달 1 LD" : `${t} LD`}
            </text>
          </g>
        ))}

        {/* 회전 스윕 빔 (레이더 느낌) */}
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 0 0"
            to="360 0 0"
            dur="7s"
            repeatCount="indefinite"
          />
          <path d={sweepPath} fill="rgba(110,139,255,0.13)" />
          <line x1={0} y1={0} x2={R} y2={0} stroke="rgba(150,175,255,0.7)" strokeWidth={1.5} />
        </g>

        {/* 지구(중심) — 실제 위성 사진(NASA 블루마블) + 대기 글로우 */}
        <g>
          <circle cx={0} cy={0} r={30} fill="url(#earthAtmo)" />
          {/* 사진의 검은 여백이 원 밖으로 나가도록 살짝 크게(overscan) 넣고 원으로 클립 */}
          <image
            href="/earth.jpg"
            x={-23}
            y={-23}
            width={46}
            height={46}
            clipPath="url(#earthClip)"
            preserveAspectRatio="xMidYMid slice"
          />
          <circle cx={0} cy={0} r={19} fill="none" stroke="rgba(120,175,255,0.4)" strokeWidth={1} />
          <text x={0} y={34} textAnchor="middle" fontSize={9} fill="#cdd6ff">
            지구
          </text>
        </g>

        {/* 위험 소행성 펄스(붉은 파동) */}
        {points
          .filter((p) => p.n.hazardous)
          .map((p) => (
            <circle key={`pulse-${p.n.id}`} cx={p.x} cy={p.y} fill="none" stroke="#ff6b6b">
              <animate
                attributeName="r"
                values={`${p.size};${p.size * 2.6};${p.size}`}
                dur="2.2s"
                repeatCount="indefinite"
              />
              <animate attributeName="opacity" values="0.7;0;0.7" dur="2.2s" repeatCount="indefinite" />
            </circle>
          ))}

        {/* 호버 시 지구까지 연결선 + 거리 */}
        {hover && hoverPoint && (
          <g>
            <line
              x1={0}
              y1={0}
              x2={hoverPoint.x}
              y2={hoverPoint.y}
              stroke="rgba(255,255,255,0.55)"
              strokeDasharray="3 3"
            />
            <text
              x={hoverPoint.x / 2}
              y={hoverPoint.y / 2 - 4}
              textAnchor="middle"
              fontSize={9}
              fill="#e9edf6"
            >
              {hover.missDistanceLunar?.toFixed(1)} LD
            </text>
          </g>
        )}

        {/* 소행성 — 불규칙 바위 + 속도 트레일 + 바깥에서 날아드는 등장 */}
        {points.map((p) => (
          <g key={p.n.id} opacity={0}>
            <animate
              attributeName="opacity"
              from="0"
              to="1"
              begin={`${p.delay}s`}
              dur="0.5s"
              fill="freeze"
            />
            <animateTransform
              attributeName="transform"
              type="translate"
              from={`${(p.x + p.ux * 70).toFixed(1)} ${(p.y + p.uy * 70).toFixed(1)}`}
              to={`${p.x.toFixed(1)} ${p.y.toFixed(1)}`}
              begin={`${p.delay}s`}
              dur="0.85s"
              fill="freeze"
              calcMode="spline"
              keyTimes="0;1"
              keySplines="0.15 0.7 0.25 1"
            />
            {/* 바위 실루엣 (fractalNoise 라이팅으로 암석 질감) */}
            <path
              d={p.path}
              fill={p.n.hazardous ? "#9c4a3c" : "#7a7166"}
              filter={p.n.hazardous ? "url(#rockSurfDanger)" : "url(#rockSurf)"}
            />
            {/* 이벤트/호버 윤곽선 (질감 위에 겹침) */}
            <path
              d={p.path}
              fill="transparent"
              stroke={hover?.id === p.n.id ? "#ffffff" : "rgba(0,0,0,0.35)"}
              strokeWidth={hover?.id === p.n.id ? 1.2 : 0.5}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHover(p.n)}
              onMouseLeave={() => setHover(null)}
            />
          </g>
        ))}
      </svg>

      <div className="overlay" style={{ bottom: 12, left: 16 }}>
        <div className="muted" style={{ fontSize: 11 }}>
          <span style={{ color: "#ff6b6b" }}>●</span> 위험 ·{" "}
          <span style={{ color: "#7cc4ff" }}>●</span> 일반 · 점 크기=지름 · 중심에 가까울수록 근접
        </div>
      </div>
    </div>
  );
}
