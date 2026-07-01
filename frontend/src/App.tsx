import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Apod, api, PredictInput, PredictResult, Stats } from "./api";
import SpaceView from "./SpaceView";
import SystemDetail from "./SystemDetail";
import DataBrowser from "./DataBrowser";
import NeoPanel from "./NeoPanel";
import SolarSystem from "./SolarSystem";

const EARTH: PredictInput = {
  orbitalPeriodDays: 365.25,
  radiusEarth: 1.0,
  stellarTeffK: 5778,
  stellarMassSun: 1.0,
};

const FIELD_LABEL: Record<keyof PredictInput, string> = {
  orbitalPeriodDays: "공전주기 (일)",
  radiusEarth: "반지름 (지구=1)",
  stellarTeffK: "항성온도 (K)",
  stellarMassSun: "항성질량 (태양=1)",
};

// 상위 탭 = 주제(데이터 소스)별. soon=아직 미구현(예정 배지).
const TABS = [
  { id: "home", label: "태양계" },
  { id: "exo", label: "외계행성" },
  { id: "apod", label: "천문사진" },
  { id: "neo", label: "근지구 천체" },
  { id: "weather", label: "우주기상", soon: true },
  { id: "media", label: "미디어 검색", soon: true },
] as const;
type TabId = (typeof TABS)[number]["id"];

// 외계행성 탭 내부 하위 탭.
const EXO_TABS = [
  { id: "map", label: "성도" },
  { id: "stats", label: "통계" },
  { id: "data", label: "데이터" },
  { id: "ai", label: "AI 예측" },
] as const;
type ExoTabId = (typeof EXO_TABS)[number]["id"];

export default function App() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState<PredictInput>(EARTH);
  const [pred, setPred] = useState<PredictResult | null>(null);
  const [apod, setApod] = useState<Apod | null>(null);
  const [apods, setApods] = useState<Apod[]>([]);
  const [selectedHost, setSelectedHost] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("home");
  const [exoTab, setExoTab] = useState<ExoTabId>("map");

  const loadStats = () => api.stats().then(setStats).catch((e) => setMsg(String(e)));
  const loadApod = () => api.apodLatest().then(setApod).catch(() => {});
  const loadGallery = () => api.apodGallery().then(setApods).catch(() => {});

  useEffect(() => {
    loadStats();
    loadApod();
    loadGallery();
  }, []);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true);
    setMsg(`${label} 실행 중…`);
    try {
      await fn();
      setMsg(`${label} 완료`);
      await loadStats();
    } catch (e) {
      setMsg(`${label} 실패: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  const collectApod = async (recent: boolean) => {
    setBusy(true);
    setMsg(recent ? "최근 천문사진 수집 중…" : "오늘의 천문사진 수집 중…");
    try {
      // 오늘 이미 저장돼 있으면 NASA 호출을 건너뜀 → 하루 API 한도 절약
      let cached = false;
      if (recent) {
        await api.ingestApodRecent(5);
      } else {
        const res = await api.ingestApod();
        cached = !!res && res.calledNasaApi === false;
      }
      await new Promise((r) => setTimeout(r, recent ? 1500 : 1000));
      await loadApod();
      await loadGallery();
      setMsg(cached ? "오늘 사진은 이미 저장돼 있어 API 없이 불러왔어요" : "천문사진 갱신 완료");
    } catch (e) {
      setMsg(`천문사진 실패: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  const doPredict = async () => {
    setBusy(true);
    try {
      setPred(await api.predict(input));
      setMsg("예측 완료");
    } catch (e) {
      setMsg(`예측 실패: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  const yearData = stats
    ? Object.entries(stats.byDiscoveryYear)
        .map(([year, count]) => ({ year, count }))
        .sort((a, b) => a.year.localeCompare(b.year))
    : [];

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <h1>COSMOS</h1>
          <span className="sub">NASA Open Data Explorer</span>
        </div>
      </div>
      {tab !== "home" && <div className="status">{msg}</div>}

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab${tab === t.id ? " active" : ""}`}
            disabled={"soon" in t && t.soon}
            title={"soon" in t && t.soon ? "준비 중" : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {"soon" in t && t.soon && <span className="badge">예정</span>}
          </button>
        ))}
      </div>

      {tab === "home" && <SolarSystem fullscreen />}

      {tab === "exo" && (
        <>
          <div className="tabbar">
            <div className="subtabs">
              {EXO_TABS.map((t) => (
                <button
                  key={t.id}
                  className={`tab${exoTab === t.id ? " active" : ""}`}
                  onClick={() => setExoTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="actions">
              <button
                className="primary"
                disabled={busy}
                onClick={() => run("외계행성 수집", api.backfill)}
              >
                데이터 수집
              </button>
              <button disabled={busy} onClick={() => run("타임라인 재생", api.replay)}>
                타임라인 재생
              </button>
              <button className="ghost" disabled={busy} onClick={loadStats}>
                새로고침
              </button>
            </div>
          </div>

          {exoTab === "map" && (
            <div className="section">
              <SpaceView onSelect={setSelectedHost} />
              {selectedHost && (
                <SystemDetail
                  hostname={selectedHost}
                  onClose={() => setSelectedHost(null)}
                />
              )}
            </div>
          )}

          {exoTab === "stats" && (
            <>
      <div className="row section">
        <div className="card metric">
          <div className="label">등록된 외계행성</div>
          <div className="value">{stats?.total ?? "—"}</div>
        </div>
        <div className="card metric">
          <div className="label">평균 거리</div>
          <div className="value">
            {stats?.averageDistancePc ? stats.averageDistancePc.toFixed(1) : "—"}
            <span className="unit">pc</span>
          </div>
        </div>
        <div className="card metric">
          <div className="label">발견 방법</div>
          <div className="value">
            {stats ? Object.keys(stats.byDiscoveryMethod).length : "—"}
            <span className="unit">종</span>
          </div>
        </div>
      </div>

      <div className="card section">
        <h2>연도별 발견 추이</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={yearData} margin={{ left: -18 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="year" stroke="#8a93ab" tick={{ fontSize: 11 }} />
            <YAxis stroke="#8a93ab" tick={{ fontSize: 11 }} />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              contentStyle={{
                background: "#0b1124",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
              }}
            />
            <Bar dataKey="count" fill="#6e8bff" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card section">
        <h2>가까운 외계행성</h2>
        <table>
          <thead>
            <tr>
              <th>이름</th>
              <th>거리 (pc)</th>
            </tr>
          </thead>
          <tbody>
            {stats?.nearest.map((p) => (
              <tr key={p.name}>
                <td>{p.name}</td>
                <td>{p.distancePc?.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        </>
      )}

          {exoTab === "data" && <DataBrowser />}

          {exoTab === "ai" && (
            <div className="card section">
              <h2>AI 예측 · 질량과 항성 나이</h2>
              <p className="muted" style={{ marginTop: -4 }}>
                반지름·공전주기·항성 특성으로 질량–반지름 관계 기반 질량(지구=1)과 항성 나이(Gyr)를 추정합니다.
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: 12,
                  marginTop: 12,
                }}
              >
                {(Object.keys(EARTH) as (keyof PredictInput)[]).map((k) => (
                  <label className="field" key={k}>
                    {FIELD_LABEL[k]}
                    <input
                      type="number"
                      value={input[k]}
                      onChange={(e) => setInput({ ...input, [k]: parseFloat(e.target.value) })}
                    />
                  </label>
                ))}
              </div>
              <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <button className="primary" disabled={busy} onClick={doPredict}>
                  예측하기
                </button>
                <button disabled={busy} onClick={() => run("모델 학습", api.trainAI)}>
                  모델 학습
                </button>
                {pred && (
                  <div style={{ display: "flex", gap: 28 }}>
                    <div>
                      <div className="muted" style={{ fontSize: 11 }}>예측 질량</div>
                      <div style={{ fontWeight: 600 }}>{pred.massEarth ?? "—"} ⊕</div>
                    </div>
                    <div>
                      <div className="muted" style={{ fontSize: 11 }}>예측 항성 나이</div>
                      <div style={{ fontWeight: 600 }}>{pred.stellarAgeGyr ?? "—"} Gyr</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {tab === "apod" && (
        <div className="card section">
          <div className="head">
            <h2>오늘의 천문사진</h2>
            <div className="actions">
              <button disabled={busy} onClick={() => collectApod(false)}>
                오늘의 사진
              </button>
              <button disabled={busy} onClick={() => collectApod(true)}>
                최근 사진 수집
              </button>
            </div>
          </div>

          {apod ? (
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              {apod.mediaType === "image" ? (
                <img
                  src={apod.url}
                  alt={apod.title}
                  style={{
                    width: 340,
                    maxWidth: "100%",
                    borderRadius: 12,
                    objectFit: "cover",
                  }}
                />
              ) : (
                <a href={apod.url} target="_blank" rel="noreferrer">
                  영상 보기
                </a>
              )}
              <div style={{ flex: 1, minWidth: 280 }}>
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{apod.title}</div>
                <div className="muted" style={{ marginBottom: 10 }}>{apod.date}</div>
                <p className="muted">{apod.explanation}</p>
                {apod.copyright && <div className="muted">© {apod.copyright}</div>}
              </div>
            </div>
          ) : (
            <div className="muted">
              저장된 천문사진이 없습니다. ‘오늘의 사진’으로 수집하면 Elasticsearch에 저장됩니다.
            </div>
          )}

          {apods.length > 0 && (
            <div className="gallery" style={{ marginTop: 18 }}>
              {apods.map((a) => (
                <div className="thumb" key={a.date} onClick={() => setApod(a)} title={a.title}>
                  {a.mediaType === "image" ? (
                    <img src={a.url} alt={a.title} />
                  ) : (
                    <div style={{ height: 88, display: "grid", placeItems: "center" }}>VIDEO</div>
                  )}
                  <div className="cap">{a.date}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "neo" && <NeoPanel />}
    </div>
  );
}
