import { useEffect, useState } from "react";
import { api, Planet } from "./api";

const PALETTE = ["#7cc4ff", "#ffd27c", "#9affc4", "#ff9ed1", "#c4a0ff", "#ffb27c", "#a0f0ff"];

function starColor(teff: number | null): string {
  if (!teff) return "#ffcc66";
  if (teff >= 7500) return "#aabfff";
  if (teff >= 6000) return "#fff4e8";
  if (teff >= 5000) return "#ffe9a8";
  if (teff >= 4000) return "#ffd2a1";
  return "#ff9d5c";
}

/** "Kepler-90 i" → "i" (행성 식별 글자) */
function planetTag(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1];
}

export default function SystemDetail({
  hostname,
  onClose,
}: {
  hostname: string;
  onClose: () => void;
}) {
  const [planets, setPlanets] = useState<Planet[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    setPlanets([]);
    setErr("");
    api.system(hostname).then(setPlanets).catch((e) => setErr(String(e)));
  }, [hostname]);

  const first = planets[0];
  const n = planets.length;
  const star = starColor(first?.stellarTeffK ?? null);

  return (
    <div className="card section">
      <div className="head">
        <h2>{hostname} 항성계</h2>
        <button className="ghost" onClick={onClose}>
          닫기
        </button>
      </div>

      <p className="muted" style={{ marginTop: -6 }}>
        가운데 별이 <b style={{ color: star }}>항성 {hostname}</b>, 그 주위를 도는 색 점들이{" "}
        <b>행성 {n}개</b>입니다. 안쪽일수록 공전주기가 짧아요.
        {first?.distancePc ? ` 지구에서 ${first.distancePc.toFixed(1)} pc.` : ""}
      </p>

      {err && <div className="muted">상세 로드 실패: {err}</div>}

      {n > 0 && (
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 8 }}>
          <svg viewBox="-165 -160 330 330" style={{ width: 320, height: 320, flexShrink: 0 }}>
            {/* 중심 항성 + 글로우 + 이름 */}
            <circle cx={0} cy={0} r={22} fill={star} opacity={0.18} />
            <circle cx={0} cy={0} r={13} fill={star} />
            <text x={0} y={36} textAnchor="middle" fontSize={11} fill="#cdd6ff">
              ★ {hostname}
            </text>

            {planets.map((p, i) => {
              const orbitR = 44 + ((i + 1) * 108) / n;
              const size = p.radiusEarth
                ? Math.max(3, Math.min(11, Math.sqrt(p.radiusEarth) * 2.2))
                : 4;
              const dur = 8 + i * 5;
              const color = PALETTE[i % PALETTE.length];
              return (
                <g key={p.name}>
                  <circle
                    cx={0}
                    cy={0}
                    r={orbitR}
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth={1}
                  />
                  {/* 궤도 식별 라벨(정지) */}
                  <text x={orbitR + 5} y={4} fontSize={10} fill={color}>
                    {planetTag(p.name)}
                  </text>
                  {/* 공전하는 행성 */}
                  <g>
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from="0 0 0"
                      to="360 0 0"
                      dur={`${dur}s`}
                      repeatCount="indefinite"
                    />
                    <circle cx={orbitR} cy={0} r={size} fill={color} />
                  </g>
                </g>
              );
            })}
          </svg>

          <table style={{ flex: 1, minWidth: 320 }}>
            <thead>
              <tr>
                <th>행성</th>
                <th>공전(일)</th>
                <th>반지름(⊕)</th>
                <th>질량(⊕)</th>
                <th>발견</th>
              </tr>
            </thead>
            <tbody>
              {planets.map((p, i) => (
                <tr key={p.name}>
                  <td>
                    <span
                      style={{
                        display: "inline-block",
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        background: PALETTE[i % PALETTE.length],
                        marginRight: 8,
                      }}
                    />
                    {p.name}
                  </td>
                  <td>{p.orbitalPeriodDays?.toFixed(2) ?? "—"}</td>
                  <td>{p.radiusEarth?.toFixed(2) ?? "—"}</td>
                  <td>{p.massEarth?.toFixed(2) ?? "—"}</td>
                  <td>
                    {p.discYear ?? "—"}
                    {p.discoveryMethod ? ` · ${p.discoveryMethod}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
