import { useEffect, useMemo, useState } from "react";
import { api, NeoApproach } from "./api";
import NeoRadar from "./NeoRadar";
import Term from "./Term";

export default function NeoPanel() {
  const [rows0, setRows0] = useState<NeoApproach[]>([]);
  const [search, setSearch] = useState("");
  const [onlyHazard, setOnlyHazard] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [dateMode, setDateMode] = useState(false); // true=날짜 구간 조회 중, false=다가오는(기본)
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // 파라미터 없으면 서버가 다가오는 접근(오늘 이후)만 준다. 날짜 지정 시 그 구간(과거 포함).
  const load = (f?: string, t?: string) =>
    api.neoList(f, t).then(setRows0).catch((e) => setMsg(String(e)));

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows0.filter((n) => {
      if (onlyHazard && !n.hazardous) return false;
      if (q && !n.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows0, search, onlyHazard]);

  // 과거 포함 날짜 구간 조회.
  const queryByDate = async () => {
    if (!from && !to) return;
    setBusy(true);
    setMsg("날짜 조회 중…");
    try {
      await load(from || undefined, to || undefined);
      setDateMode(true);
      setMsg(`조회: ${from || "처음"} ~ ${to || "끝"}`);
    } catch (e) {
      setMsg(String(e));
    } finally {
      setBusy(false);
    }
  };

  // 기본 상태(다가오는 접근)로 되돌린다.
  const showUpcoming = async () => {
    setFrom("");
    setTo("");
    setDateMode(false);
    setBusy(true);
    try {
      await load();
      setMsg("다가오는 접근(오늘 이후)");
    } finally {
      setBusy(false);
    }
  };

  const collect = async () => {
    setBusy(true);
    setMsg("근지구 천체 수집 중…");
    try {
      // 오늘~+6일(7일 창) 범위 수집. 이미 저장돼 있으면 서버가 NASA 호출을 건너뜀.
      const res = await api.ingestNeo();
      await new Promise((r) => setTimeout(r, 1500));
      setFrom("");
      setTo("");
      setDateMode(false);
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
            style={{ width: 180 }}
          />
          <div className="subtabs">
            <button
              className={`tab${!dateMode ? " active" : ""}`}
              disabled={busy}
              onClick={showUpcoming}
            >
              다가오는
            </button>
            <button
              className={`tab${onlyHazard ? " active" : ""}`}
              onClick={() => setOnlyHazard((v) => !v)}
            >
              위험만
            </button>
          </div>
          {/* 과거 데이터는 날짜 구간으로 조회 */}
          <div className="neo-daterange" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span className="muted">~</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            <button className="ghost" disabled={busy || (!from && !to)} onClick={queryByDate}>
              날짜 조회
            </button>
          </div>
        </div>
        <div className="actions">
          <button className="primary" disabled={busy} onClick={collect}>
            소행성 수집
          </button>
          <button className="ghost" disabled={busy} onClick={() => load(from || undefined, to || undefined)}>
            새로고침
          </button>
        </div>
      </div>

      <div className="status">{msg}</div>

      {rows0.length === 0 ? (
        <div className="card section">
          <h2>근지구 천체 · NeoWs</h2>
          <div className="muted">
            {dateMode
              ? "해당 기간에 저장된 접근 데이터가 없습니다. 다른 날짜를 조회하거나 ‘소행성 수집’으로 받아오세요."
              : "다가오는 접근 데이터가 없습니다. ‘소행성 수집’으로 오늘~+6일의 지구 접근 천체를 받아오세요."}
          </div>
        </div>
      ) : (
        <>
          <div className="card section">
            <div className="head">
              <h2>근접 레이더 · 지구 기준</h2>
              <span className="muted" style={{ fontSize: 12 }}>
                {rows.length} / {rows0.length}건 표시
              </span>
            </div>
            <NeoRadar rows={rows} />
          </div>

          <div className="card section">
            <h2>접근 목록{dateMode ? " · 날짜 조회" : " · 다가오는"}</h2>
            <table>
              <thead>
                <tr>
                  <th>이름</th>
                  <th>
                    <Term k="접근일">접근일</Term>
                  </th>
                  <th>
                    최소거리 (<Term k="달거리">달거리</Term>)
                  </th>
                  <th>
                    속도 (<Term k="km/s">km/s</Term>)
                  </th>
                  <th>지름 (km)</th>
                  <th>
                    <Term k="위험">위험</Term>
                  </th>
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
