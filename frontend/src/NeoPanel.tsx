import { useEffect, useMemo, useState } from "react";
import { api, NeoApproach } from "./api";
import NeoRadar from "./NeoRadar";

const TODAY = new Date().toISOString().slice(0, 10);

type Filter = "all" | "upcoming" | "hazardous";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "upcoming", label: "다가오는" },
  { id: "hazardous", label: "위험" },
];

export default function NeoPanel() {
  const [all, setAll] = useState<NeoApproach[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () => api.neoList().then(setAll).catch((e) => setMsg(String(e)));

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((n) => {
      if (filter === "hazardous" && !n.hazardous) return false;
      if (filter === "upcoming" && n.closeApproachDate < TODAY) return false;
      if (q && !n.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [all, search, filter]);

  const collect = async () => {
    setBusy(true);
    setMsg("근지구 천체 수집 중…");
    try {
      // 오늘~+6일(7일 창) 범위 수집. 이미 저장돼 있으면 서버가 NASA 호출을 건너뜀.
      const res = await api.ingestNeo();
      await new Promise((r) => setTimeout(r, 1500));
      await load();
      setMsg(
        res.calledNasaApi
          ? `수집 완료 · ${res.produced}건 (${res.startDate}~${res.endDate})`
          : "이미 저장돼 있어 API 없이 불러왔어요"
      );
    } catch (e) {
      setMsg(`수집 실패: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="tabbar">
        <div className="neo-filters">
          <input
            type="text"
            placeholder="소행성 이름 검색…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 200 }}
          />
          <div className="subtabs">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                className={`tab${filter === f.id ? " active" : ""}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="actions">
          <button className="primary" disabled={busy} onClick={collect}>
            소행성 수집
          </button>
          <button className="ghost" disabled={busy} onClick={load}>
            새로고침
          </button>
        </div>
      </div>

      <div className="status">{msg}</div>

      {all.length === 0 ? (
        <div className="card section">
          <h2>근지구 천체 · NeoWs</h2>
          <div className="muted">
            저장된 데이터가 없습니다. ‘소행성 수집’으로 오늘~+6일의 지구 접근 천체를 받아오세요.
          </div>
        </div>
      ) : (
        <>
          <div className="card section">
            <div className="head">
              <h2>근접 레이더 · 지구 기준</h2>
              <span className="muted" style={{ fontSize: 12 }}>
                {rows.length} / {all.length}건 표시
              </span>
            </div>
            <NeoRadar rows={rows} />
          </div>

          <div className="card section">
            <h2>접근 목록</h2>
            <table>
              <thead>
                <tr>
                  <th>이름</th>
                  <th>접근일</th>
                  <th>최소거리 (달거리)</th>
                  <th>속도 (km/s)</th>
                  <th>지름 (km)</th>
                  <th>위험</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((n) => (
                  <tr key={n.id}>
                    <td>{n.name}</td>
                    <td>{n.closeApproachDate}</td>
                    <td>{n.missDistanceLunar != null ? n.missDistanceLunar.toFixed(1) : "—"}</td>
                    <td>{n.relativeVelocityKmS != null ? n.relativeVelocityKmS.toFixed(1) : "—"}</td>
                    <td>
                      {n.diameterMinKm != null && n.diameterMaxKm != null
                        ? `${n.diameterMinKm.toFixed(3)}–${n.diameterMaxKm.toFixed(3)}`
                        : "—"}
                    </td>
                    <td>{n.hazardous ? <span className="badge-danger">위험</span> : "—"}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="muted">
                      조건에 맞는 소행성이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
