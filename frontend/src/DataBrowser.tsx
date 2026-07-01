import { useEffect, useState } from "react";
import { api, Paged, Planet } from "./api";

export default function DataBrowser() {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Paged<Planet> | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState(""); // 디바운스된 실제 검색어

  // 입력이 멈추면(300ms) 검색어 확정 → 페이지 0으로
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    api
      .list(page, 15, query)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, query]);

  const totalPages = data?.page?.totalPages ?? 1;
  const total = data?.page?.totalElements ?? 0;
  const rows = data?.content ?? [];

  return (
    <div className="card section">
      <div className="head">
        <h2>저장된 외계행성 데이터</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input
            type="text"
            placeholder="이름·항성 검색…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 200 }}
          />
          <span className="muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
            {query ? `검색 ${total}개` : `DB 전체 ${total}개`} ·{" "}
            {totalPages > 0 ? page + 1 : 0}/{Math.max(totalPages, 1)} 페이지
          </span>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>이름</th>
            <th>항성</th>
            <th>거리(pc)</th>
            <th>공전(일)</th>
            <th>반지름(⊕)</th>
            <th>질량(⊕)</th>
            <th>발견</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.name}>
              <td>{p.name}</td>
              <td>{p.hostname}</td>
              <td>{p.distancePc?.toFixed(1) ?? "—"}</td>
              <td>{p.orbitalPeriodDays?.toFixed(2) ?? "—"}</td>
              <td>{p.radiusEarth?.toFixed(2) ?? "—"}</td>
              <td>{p.massEarth?.toFixed(2) ?? "—"}</td>
              <td>
                {p.discYear ?? "—"}
                {p.discoveryMethod ? ` · ${p.discoveryMethod}` : ""}
              </td>
            </tr>
          ))}
          {rows.length === 0 && !loading && (
            <tr>
              <td colSpan={7} className="muted">
                저장된 데이터가 없습니다. ‘데이터 수집’으로 채우세요.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
          이전
        </button>
        <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
          다음
        </button>
      </div>
    </div>
  );
}
