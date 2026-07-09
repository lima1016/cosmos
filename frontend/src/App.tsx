import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Apod, api, MassRadiusPoint, Planet, PredictInput, PredictResult, Stats } from "./api";
import { GLOSSARY } from "./glossary";
import Term from "./Term";
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

const APOD_PAGE = 24; // 갤러리 한 페이지 크기(백엔드 findTop24 와 일치)

// 차트 공통 스타일/팔레트
const CHART_TOOLTIP = {
  background: "#0b1124",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  color: "#e6e9f2",
};
// 툴팁 항목 글자색(기본값은 계열 색/검정이라 어두운 배경에서 안 보임 → 밝게 고정)
const CHART_TOOLTIP_ITEM = { color: "#e6e9f2" };
const PALETTE = ["#6e8bff", "#f2c14e", "#4ecdc4", "#ff6b6b", "#a78bfa", "#38bdf8", "#f472b6", "#84cc16"];
// 반지름 기준 행성 유형(백엔드 영문 키 → 한국어 표시)
const TYPE_LABEL: Record<string, string> = {
  Rocky: "암석형",
  "Super-Earth": "슈퍼지구",
  "Neptune-like": "해왕성형",
  "Gas Giant": "목성형",
};

const FIELD_LABEL: Record<keyof PredictInput, string> = {
  orbitalPeriodDays: "공전주기 (일)",
  radiusEarth: "반지름 (지구=1)",
  stellarTeffK: "항성온도 (K)",
  stellarMassSun: "항성질량 (태양=1)",
};

// 필드 라벨 → 용어사전 조회 키(인라인 툴팁용).
const FIELD_TERM_KEY: Record<keyof PredictInput, string> = {
  orbitalPeriodDays: "공전주기",
  radiusEarth: "반지름",
  stellarTeffK: "항성온도",
  stellarMassSun: "항성질량",
};

// 각 입력의 일반적 범위 힌트(사용자가 뭘 넣을지 감 잡게).
const FIELD_HINT: Record<keyof PredictInput, string> = {
  orbitalPeriodDays: "예: 1~수천 (지구 365)",
  radiusEarth: "예: 0.5~15 (지구 1)",
  stellarTeffK: "예: 3000~7000 (태양 5778)",
  stellarMassSun: "예: 0.3~2 (태양 1)",
};

// 태양계 천체 프리셋(태양을 도는 값). 클릭하면 폼 자동 입력.
const PRESETS: { label: string; values: PredictInput }[] = [
  { label: "지구", values: { orbitalPeriodDays: 365.25, radiusEarth: 1, stellarTeffK: 5778, stellarMassSun: 1 } },
  { label: "목성", values: { orbitalPeriodDays: 4332.6, radiusEarth: 11.21, stellarTeffK: 5778, stellarMassSun: 1 } },
  { label: "해왕성", values: { orbitalPeriodDays: 60190, radiusEarth: 3.88, stellarTeffK: 5778, stellarMassSun: 1 } },
];

// 반지름(지구=1) → 유형(통계 탭과 동일 기준).
function planetType(radiusEarth: number): string {
  if (radiusEarth < 1.25) return "암석형";
  if (radiusEarth < 2) return "슈퍼지구";
  if (radiusEarth < 6) return "해왕성형";
  return "목성형";
}

// 크기 비교 원 지름 clamp(너무 크거나 작아 안 보이는 것 방지).
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// 항성 표면온도(K) → 색(적색왜성~청백색). 실제 별 색 = 표면온도(흑체복사).
function teffColor(k: number): string {
  if (!Number.isFinite(k)) return "#ffd94a";
  if (k < 3700) return "#ff6b4a"; // M 적색
  if (k < 5200) return "#ffb457"; // K 주황
  if (k < 6000) return "#ffd94a"; // G 노랑(태양 ≈5778)
  if (k < 7500) return "#fff4d6"; // F 백색
  return "#aaccff"; // A+ 청백색
}

// 행성 유형별 색.
const TYPE_COLOR: Record<string, string> = {
  암석형: "#c8896b",
  슈퍼지구: "#4ecdc4",
  해왕성형: "#5a8dee",
  목성형: "#e8a15a",
};

// 크기 비교용 구체.
// - 행성(이미지 없음): 유형색 입체 구. star(이미지 없음): 온도색 발광 구(다른 별은 사진이 없어 색으로 표현).
// - image: 실사 텍스처(overscan 으로 원판 검은여백 제거). 지구=음영, 태양(star)=주연감광.
function Orb({
  d,
  color,
  image,
  star,
  scale = 1.4,
}: {
  d: number;
  color: string;
  image?: string;
  star?: boolean;
  scale?: number;
}) {
  const shade =
    "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.85), rgba(255,255,255,0) 42%)," +
    "radial-gradient(circle at 72% 78%, rgba(0,0,0,0.55), rgba(0,0,0,0) 58%)";
  const starBg =
    "radial-gradient(circle at 50% 47%, #ffffff 0%, rgba(255,255,255,0) 40%)," +
    "radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.35) 100%)," +
    `${color}`;
  return (
    <div
      style={{
        width: d,
        height: d,
        borderRadius: "50%",
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
        background: image ? "#05070f" : star ? starBg : `${shade}, ${color}`,
        boxShadow: star ? `0 0 24px 4px ${color}99` : `0 0 15px ${color}44`,
      }}
    >
      {image && (
        <img
          src={image}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transform: `scale(${scale})` }}
        />
      )}
      {image && star && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.4) 100%)",
          }}
        />
      )}
      {image && !star && <div style={{ position: "absolute", inset: 0, background: shade }} />}
    </div>
  );
}

// 폼은 문자열로 관리한다 → 빈 칸이 NaN→null 로 새어나가 서버 422 나는 걸 막는다.
type PredictForm = Record<keyof PredictInput, string>;
// 첫 화면 기본값 = 목성. (지구를 기본으로 두면 "지구 vs 지구"가 떠서 혼란 → 크게 다른 예시로 시작)
const DEFAULT_FORM: PredictForm = {
  orbitalPeriodDays: "4332.6",
  radiusEarth: "11.21",
  stellarTeffK: "5778",
  stellarMassSun: "1",
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
  const [massRadius, setMassRadius] = useState<MassRadiusPoint[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState<PredictForm>(DEFAULT_FORM);
  const [pred, setPred] = useState<PredictResult | null>(null);
  const [selectedActual, setSelectedActual] = useState<Planet | null>(null); // 선택한 실제 행성(실측 비교용)
  const [inputLabel, setInputLabel] = useState("목성"); // 현재 입력값의 출처 이름(폼 기본=목성)
  const [pickerOpen, setPickerOpen] = useState(false); // 행성 선택 팝업
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerList, setPickerList] = useState<Planet[]>([]);
  const [pickerPage, setPickerPage] = useState(0);
  const [pickerHasMore, setPickerHasMore] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [apod, setApod] = useState<Apod | null>(null);
  const [apods, setApods] = useState<Apod[]>([]);
  const [showKo, setShowKo] = useState(false); // APOD 한국어 표시 여부
  const [translating, setTranslating] = useState(false);
  const [hasMore, setHasMore] = useState(false); // 더 불러올 페이지가 있는지
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedHost, setSelectedHost] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("home");
  const [exoTab, setExoTab] = useState<ExoTabId>("map");
  const [glossaryOpen, setGlossaryOpen] = useState(false); // 전역 용어사전
  const [glossaryQuery, setGlossaryQuery] = useState("");

  const loadStats = () => api.stats().then(setStats).catch((e) => setMsg(String(e)));
  const loadMassRadius = () => api.massRadius().then(setMassRadius).catch(() => {});
  const loadApod = () => api.apodLatest().then(setApod).catch(() => {});

  // 최신 페이지 로드(갤러리 초기화). 24개 꽉 차면 더보기 가능.
  const loadGallery = async () => {
    try {
      const list = await api.apodGallery();
      setApods(list);
      setHasMore(list.length === APOD_PAGE);
    } catch {
      /* 인덱스 없음 등은 조용히 무시 */
    }
  };

  // 더보기: 현재 목록의 가장 오래된 날짜보다 과거 24개를 이어 붙인다.
  const loadMore = async () => {
    if (apods.length === 0) return;
    setLoadingMore(true);
    try {
      const oldest = apods[apods.length - 1].date;
      const more = await api.apodGallery(oldest);
      setApods((cur) => [...cur, ...more]);
      setHasMore(more.length === APOD_PAGE);
    } catch (e) {
      setMsg(`더 불러오기 실패: ${e}`);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadStats();
    loadMassRadius();
    loadApod();
    loadGallery();
  }, []);

  // 팝업이 열려 있으면 검색어(디바운스) 변화에 따라 목록 첫 페이지 로드.
  useEffect(() => {
    if (!pickerOpen) return;
    const id = setTimeout(() => loadPicker(0, pickerQuery, false), 300);
    return () => clearTimeout(id);
    // loadPicker 는 매 렌더 재생성되지만 내부에서 최신 state 만 쓰므로 deps 는 아래 둘로 충분.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerQuery, pickerOpen]);

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

  // 한국어 번역 확보: 이미 있으면 그대로, 없으면 서버에 요청(번역·캐시). 갤러리 목록도 갱신.
  const ensureKo = async (target: Apod) => {
    if (target.titleKo) return;
    setTranslating(true);
    try {
      const t = await api.translateApod(target.date);
      setApod((cur) => (cur && cur.date === t.date ? t : cur));
      setApods((list) => list.map((a) => (a.date === t.date ? t : a)));
    } catch (e) {
      setMsg(`번역 실패: ${e}`);
    } finally {
      setTranslating(false);
    }
  };

  const toggleLang = async () => {
    const next = !showKo;
    setShowKo(next);
    if (next && apod) await ensureKo(apod);
  };

  // 갤러리 썸네일 선택: 현재 한국어 보기 중이면 새 사진도 번역 확보.
  const selectApod = (a: Apod) => {
    setApod(a);
    if (showKo) ensureKo(a);
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

  // 행성 목록 팝업: 한 페이지 30개, 검색어(q) 부분일치.
  const PICKER_SIZE = 30;
  const loadPicker = async (page: number, q: string, append: boolean) => {
    setPickerLoading(true);
    try {
      const res = await api.list(page, PICKER_SIZE, q.trim());
      setPickerList((cur) => (append ? [...cur, ...res.content] : res.content));
      setPickerPage(page);
      setPickerHasMore(res.content.length === PICKER_SIZE);
    } catch (e) {
      setMsg(`행성 목록 실패: ${e}`);
    } finally {
      setPickerLoading(false);
    }
  };

  const openPicker = () => {
    setPickerQuery("");
    setPickerOpen(true); // 실제 로드는 위 useEffect 가 처리
  };

  // 실제 행성 선택 → 알려진 4개 값으로 폼 채움(없는 값은 빈 칸=빨강). 실측 비교용으로 보관.
  const pickPlanet = (p: Planet) => {
    setInput({
      orbitalPeriodDays: p.orbitalPeriodDays != null ? String(p.orbitalPeriodDays) : "",
      radiusEarth: p.radiusEarth != null ? String(p.radiusEarth) : "",
      stellarTeffK: p.stellarTeffK != null ? String(p.stellarTeffK) : "",
      stellarMassSun: p.stellarMassSun != null ? String(p.stellarMassSun) : "",
    });
    setSelectedActual(p);
    setInputLabel(p.name);
    setPickerOpen(false);
    setPred(null);
  };

  // 프리셋(지구/목성/…) → 폼 채움.
  const applyPreset = (label: string, v: PredictInput) => {
    setInput({
      orbitalPeriodDays: String(v.orbitalPeriodDays),
      radiusEarth: String(v.radiusEarth),
      stellarTeffK: String(v.stellarTeffK),
      stellarMassSun: String(v.stellarMassSun),
    });
    setSelectedActual(null);
    setInputLabel(label);
    setPred(null);
  };

  const doPredict = async () => {
    // 제출 직전 검증: 빈 칸·숫자 아님을 여기서 걸러 서버 422 를 방지한다.
    const keys = Object.keys(EARTH) as (keyof PredictInput)[];
    const parsed = {} as PredictInput;
    for (const k of keys) {
      const raw = input[k].trim();
      const v = Number(raw);
      if (raw === "" || !Number.isFinite(v)) {
        setMsg(`예측 실패: "${FIELD_LABEL[k]}" 값을 올바른 숫자로 입력하세요`);
        return;
      }
      parsed[k] = v;
    }
    setBusy(true);
    try {
      let result: PredictResult;
      try {
        result = await api.predict(parsed);
      } catch (e) {
        // 모델 미학습(400)이면 사용자 대신 자동 학습 후 1회 재시도.
        if (String(e).includes("학습")) {
          setMsg("모델 학습 중… (최초 1회)");
          await api.trainAI();
          result = await api.predict(parsed);
        } else {
          throw e;
        }
      }
      setPred(result);
      setMsg("예측 완료");
    } catch (e) {
      setMsg(`예측 실패: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  // 연도별 발견 수 + 누적(running sum). memo 로 stats 안 바뀌면 재계산·차트 리렌더 방지.
  const yearData = useMemo(() => {
    if (!stats) return [] as { year: string; count: number; cumulative: number }[];
    const rows = Object.entries(stats.byDiscoveryYear)
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year.localeCompare(b.year));
    let acc = 0;
    return rows.map((r) => ({ ...r, cumulative: (acc += r.count) }));
  }, [stats]);

  // 발견 방법 분포(많은 순)
  const methodData = useMemo(
    () =>
      stats
        ? Object.entries(stats.byDiscoveryMethod)
            .map(([method, count]) => ({ method, count }))
            .sort((a, b) => b.count - a.count)
        : [],
    [stats]
  );

  // 반지름 기준 행성 유형 분포(백엔드 고정 순서 → 한국어 라벨). 구버전 캐시 방어.
  const typeData = useMemo(
    () =>
      stats?.byPlanetType
        ? Object.entries(stats.byPlanetType).map(([type, count]) => ({
            type: TYPE_LABEL[type] ?? type,
            count,
          }))
        : [],
    [stats]
  );

  // 용어사전: 검색어로 거르고(표제어·뜻·별칭) 분류별로 묶는다.
  const glossaryGroups = useMemo(() => {
    const q = glossaryQuery.trim().toLowerCase();
    const filtered = q
      ? GLOSSARY.filter(
          (g) =>
            g.term.toLowerCase().includes(q) ||
            g.def.toLowerCase().includes(q) ||
            (g.aka?.toLowerCase().includes(q) ?? false)
        )
      : GLOSSARY;
    const groups: { cat: string; items: typeof GLOSSARY }[] = [];
    for (const g of filtered) {
      let grp = groups.find((x) => x.cat === g.cat);
      if (!grp) {
        grp = { cat: g.cat, items: [] };
        groups.push(grp);
      }
      grp.items.push(g);
    }
    return groups;
  }, [glossaryQuery]);

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <h1>COSMOS</h1>
          <span className="sub">NASA Open Data Explorer</span>
        </div>
        <button
          className="ghost"
          onClick={() => {
            setGlossaryQuery("");
            setGlossaryOpen(true);
          }}
          title="천문학 용어 뜻 찾아보기"
        >
          📖 용어사전
        </button>
      </div>

      {/* 전역 용어사전 모달 — 상단바에 있어 모든 탭에서 열림. portal 로 body 에 렌더. */}
      {glossaryOpen &&
        createPortal(
          <div
            onClick={() => setGlossaryOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.55)",
              zIndex: 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#0b1124",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                width: 460,
                maxWidth: "100%",
                maxHeight: "82vh",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: 14,
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <h2 style={{ margin: 0, fontSize: 15 }}>📖 천문학 용어사전</h2>
                <button className="ghost" style={{ marginLeft: "auto" }} onClick={() => setGlossaryOpen(false)}>
                  닫기
                </button>
              </div>
              <div style={{ padding: "14px 14px 8px" }}>
                <input
                  type="text"
                  placeholder="용어 검색 (예: Gyr, 항성, pc…)"
                  value={glossaryQuery}
                  onChange={(e) => setGlossaryQuery(e.target.value)}
                  style={{ width: "100%" }}
                  autoFocus
                />
              </div>
              <div style={{ overflowY: "auto", padding: "0 14px 14px" }}>
                {glossaryGroups.map((grp) => (
                  <div key={grp.cat} style={{ marginTop: 12 }}>
                    <div
                      className="muted"
                      style={{
                        fontSize: 10,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: 6,
                      }}
                    >
                      {grp.cat}
                    </div>
                    {grp.items.map((g) => (
                      <div
                        key={g.term}
                        style={{
                          padding: "9px 0",
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{g.term}</div>
                        <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.6, marginTop: 2 }}>
                          {g.def}
                        </div>
                        {g.example && (
                          <div style={{ fontSize: 11.5, color: "#8a93ab", marginTop: 3 }}>💡 {g.example}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
                {glossaryGroups.length === 0 && (
                  <div className="muted" style={{ padding: 16, textAlign: "center" }}>
                    '{glossaryQuery}'에 맞는 용어가 없어요.
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
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
            <span className="unit">
              <Term>pc</Term>
            </span>
          </div>
        </div>
        <div className="card metric">
          <div className="label">
            <Term k="발견 방법">발견 방법</Term>
          </div>
          <div className="value">
            {stats ? Object.keys(stats.byDiscoveryMethod).length : "—"}
            <span className="unit">종</span>
          </div>
        </div>
      </div>

      <div className="card section">
        <h2>연도별 발견 추이 · <Term k="누적">누적</Term></h2>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={yearData} margin={{ left: -18, right: 6 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="year" stroke="#8a93ab" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" stroke="#8a93ab" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" stroke="#8a93ab" tick={{ fontSize: 11 }} />
            <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} contentStyle={CHART_TOOLTIP} itemStyle={CHART_TOOLTIP_ITEM} labelStyle={CHART_TOOLTIP_ITEM} />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="count"
              name="연도별"
              fill="#6e8bff"
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulative"
              name="누적"
              stroke="#f2c14e"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="row section" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        <div className="card">
          <h2><Term k="발견 방법">발견 방법</Term> 분포</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={methodData}
                dataKey="count"
                nameKey="method"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={82}
                paddingAngle={2}
                isAnimationActive={false}
              >
                {methodData.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={CHART_TOOLTIP} itemStyle={CHART_TOOLTIP_ITEM} labelStyle={CHART_TOOLTIP_ITEM} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2><Term k="행성 유형">행성 유형</Term> 분포</h2>
          <p className="muted" style={{ marginTop: -4, fontSize: 12 }}>
            반지름 기준: 암석형 &lt;1.25 · 슈퍼지구 &lt;2 · 해왕성형 &lt;6 · 목성형 ≥6 (지구=1)
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={typeData} margin={{ left: -18 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="type" stroke="#8a93ab" tick={{ fontSize: 11 }} />
              <YAxis stroke="#8a93ab" tick={{ fontSize: 11 }} />
              <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} contentStyle={CHART_TOOLTIP} itemStyle={CHART_TOOLTIP_ITEM} labelStyle={CHART_TOOLTIP_ITEM} />
              <Bar dataKey="count" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                {typeData.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card section">
        <h2><Term k="질량–반지름 관계">질량–반지름 관계</Term></h2>
        <p className="muted" style={{ marginTop: -4, fontSize: 12 }}>
          질량·반지름이 모두 알려진 {massRadius.length}개 행성 (로그 스케일). AI 예측이 학습하는 바로 그 관계.
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ left: 0, right: 8, bottom: 6 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" />
            <XAxis
              type="number"
              dataKey="radiusEarth"
              name="반지름"
              scale="log"
              domain={["auto", "auto"]}
              stroke="#8a93ab"
              tick={{ fontSize: 11 }}
              label={{ value: "반지름 (지구=1)", position: "insideBottom", offset: -2, fill: "#8a93ab", fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="massEarth"
              name="질량"
              scale="log"
              domain={["auto", "auto"]}
              stroke="#8a93ab"
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              contentStyle={CHART_TOOLTIP}
              itemStyle={CHART_TOOLTIP_ITEM}
              labelStyle={CHART_TOOLTIP_ITEM}
              formatter={(v: number, n: string) => [Number(v).toFixed(2), n === "질량" ? "질량(⊕)" : "반지름(⊕)"]}
            />
            <Scatter data={massRadius} fill="#6e8bff" fillOpacity={0.45} isAnimationActive={false} />
          </ScatterChart>
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
                반지름·공전주기·항성 특성으로 질량(지구=1)과 항성 나이(Gyr)를 추정합니다. 실제 행성을 고르거나 예시로 시작해 보세요.
              </p>

              {/* 실제 외계행성 목록에서 선택(팝업) */}
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <button className="ghost" onClick={openPicker}>
                  행성 목록에서 선택
                </button>
                {selectedActual && (
                  <span className="muted" style={{ fontSize: 12 }}>
                    선택: <b>{selectedActual.name}</b> ({selectedActual.hostname})
                  </span>
                )}
              </div>

              {/* 프리셋 예시 */}
              <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span className="muted" style={{ fontSize: 12 }}>예시:</span>
                {PRESETS.map((p) => (
                  <button key={p.label} className="ghost" onClick={() => applyPreset(p.label, p.values)}>
                    {p.label}
                  </button>
                ))}
              </div>

              {/* 입력 4개 + 범위 힌트 */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: 12,
                  marginTop: 12,
                }}
              >
                {(Object.keys(EARTH) as (keyof PredictInput)[]).map((k) => {
                  const invalid = input[k].trim() === "" || !Number.isFinite(Number(input[k]));
                  return (
                    <label className="field" key={k}>
                      <Term k={FIELD_TERM_KEY[k]}>{FIELD_LABEL[k]}</Term>
                      <input
                        type="number"
                        value={input[k]}
                        onChange={(e) => {
                          setInput({ ...input, [k]: e.target.value });
                          setInputLabel("직접 입력");
                        }}
                        style={invalid ? { borderColor: "#e06c75" } : undefined}
                      />
                      <span className="muted" style={{ fontSize: 10 }}>{FIELD_HINT[k]}</span>
                    </label>
                  );
                })}
              </div>

              <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <button className="primary" disabled={busy} onClick={doPredict}>
                  예측하기
                </button>
                <button
                  className="ghost"
                  disabled={busy}
                  onClick={() => run("모델 재학습", api.trainAI)}
                  title="데이터가 늘면 다시 학습(보통 자동 학습되므로 평소엔 불필요)"
                >
                  재학습
                </button>
              </div>

              {/* 결과 + 해석 */}
              {pred &&
                (() => {
                  const r = Number(input.radiusEarth);
                  const type = Number.isFinite(r) ? planetType(r) : null;
                  const actualMass = selectedActual?.massEarth ?? null;
                  const err =
                    actualMass != null && pred.massEarth != null && actualMass !== 0
                      ? Math.abs((pred.massEarth - actualMass) / actualMass) * 100
                      : null;
                  // 크기 비교용(입력값 기준). 지구·태양=44px 기준, 상대 배율로 확대·축소(clamp).
                  const REF = 44;
                  const planetD = clamp(REF * (r || 1), 14, 150);
                  const planetColor = (type && TYPE_COLOR[type]) || "#6e8bff";
                  const mSun = Number(input.stellarMassSun);
                  const teff = Number(input.stellarTeffK);
                  const starD = clamp(REF * (mSun || 1), 16, 130);
                  const starColor = teffColor(teff);
                  const starName = selectedActual ? selectedActual.hostname : "중심별";
                  return (
                    <div className="card" style={{ marginTop: 16 }}>
                      <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
                        <div>
                          <div className="muted" style={{ fontSize: 11 }}>예측 질량</div>
                          <div style={{ fontWeight: 600, fontSize: 20 }}>
                            {pred.massEarth != null ? pred.massEarth.toFixed(2) : "—"} <Term k="⊕">⊕</Term>
                          </div>
                        </div>
                        <div>
                          <div className="muted" style={{ fontSize: 11 }}>예측 항성 나이</div>
                          <div style={{ fontWeight: 600, fontSize: 20 }}>
                            {pred.stellarAgeGyr != null ? pred.stellarAgeGyr.toFixed(1) : "—"} <Term>Gyr</Term>
                          </div>
                        </div>
                      </div>
                      <div className="muted" style={{ marginTop: 10, fontSize: 13, lineHeight: 1.8 }}>
                        {pred.massEarth != null && (
                          <div>
                            · 질량은 지구의 <b>{pred.massEarth.toFixed(1)}배</b>
                            {type && (
                              <>
                                {" "}· 반지름 기준 <b>{type}</b>
                              </>
                            )}
                          </div>
                        )}
                        {pred.stellarAgeGyr != null && (
                          <div>
                            · 항성 나이 <b>{pred.stellarAgeGyr.toFixed(1)} Gyr</b> (태양 ≈ 4.6 Gyr)
                          </div>
                        )}
                        {actualMass != null && pred.massEarth != null && (
                          <div>
                            · {selectedActual?.name} 실제 질량 <b>{actualMass.toFixed(2)} ⊕</b> → 예측 오차 약{" "}
                            <b>{err!.toFixed(0)}%</b>
                          </div>
                        )}
                      </div>

                      {/* 크기 시각 비교: 행성↔지구, 중심별↔태양 (짝 분명히) */}
                      <div style={{ marginTop: 18, display: "flex", gap: 16, flexWrap: "wrap" }}>
                        <div
                          style={{
                            flex: "1 1 240px",
                            background: "radial-gradient(120% 120% at 50% 0%, rgba(110,139,255,0.08), rgba(0,0,0,0) 70%)",
                            border: "1px solid rgba(255,255,255,0.07)",
                            borderRadius: 14,
                            padding: 16,
                          }}
                        >
                          <div className="muted" style={{ fontSize: 11, marginBottom: 12 }}>
                            🪐 행성 · <b>{inputLabel}</b> vs 지구 (반지름)
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-end",
                              justifyContent: "center",
                              gap: 28,
                              minHeight: 156,
                            }}
                          >
                            <div style={{ textAlign: "center" }}>
                              <Orb d={planetD} color={planetColor} />
                              <div className="muted" style={{ fontSize: 11, marginTop: 9 }}>{inputLabel}</div>
                            </div>
                            <div style={{ textAlign: "center" }}>
                              <Orb d={REF} color="#3b82f6" image="/earth.jpg" />
                              <div className="muted" style={{ fontSize: 11, marginTop: 9 }}>지구</div>
                            </div>
                          </div>
                          <div style={{ fontSize: 12.5, marginTop: 12, textAlign: "center" }}>
                            {inputLabel} 반지름은 지구의 <b>{Number.isFinite(r) ? r.toFixed(1) : "?"}배</b>
                            {type && <> · {type}</>}
                          </div>
                        </div>

                        <div
                          style={{
                            flex: "1 1 240px",
                            background: "radial-gradient(120% 120% at 50% 0%, rgba(255,217,74,0.09), rgba(0,0,0,0) 70%)",
                            border: "1px solid rgba(255,255,255,0.07)",
                            borderRadius: 14,
                            padding: 16,
                          }}
                        >
                          <div className="muted" style={{ fontSize: 11, marginBottom: 12 }}>
                            ⭐ 중심별 · <b>{starName}</b> vs 태양 (질량)
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-end",
                              justifyContent: "center",
                              gap: 28,
                              minHeight: 156,
                            }}
                          >
                            <div style={{ textAlign: "center" }}>
                              <Orb d={starD} color={starColor} star />
                              <div className="muted" style={{ fontSize: 11, marginTop: 9 }}>{starName}</div>
                            </div>
                            <div style={{ textAlign: "center" }}>
                              <Orb d={REF} color="#ffd94a" star image="/sun_real.jpg" />
                              <div className="muted" style={{ fontSize: 11, marginTop: 9 }}>태양</div>
                            </div>
                          </div>
                          <div style={{ fontSize: 12.5, marginTop: 12, textAlign: "center" }}>
                            {starName} 질량은 태양의 <b>{Number.isFinite(mSun) ? mSun.toFixed(2) : "?"}배</b>
                            {Number.isFinite(teff) && <> · {teff.toFixed(0)}K</>}
                          </div>
                        </div>
                      </div>

                      {/* 초보자용 짝 설명 */}
                      <div className="muted" style={{ marginTop: 12, fontSize: 12, lineHeight: 1.7 }}>
                        🪐 <b>행성</b>은 우리 <b>지구</b>와, ⭐ <b>중심별</b>(그 행성이 도는 별)은 우리 <b>태양</b>과 크기를 비교했어요.
                      </div>
                    </div>
                  );
                })()}

              {/* 행성 선택 팝업 — .card 의 backdrop-filter 컨테이닝블록을 벗어나려고 body 로 portal */}
              {pickerOpen &&
                createPortal(
                <div
                  onClick={() => setPickerOpen(false)}
                  style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0,0,0,0.55)",
                    zIndex: 50,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 16,
                  }}
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      background: "#0b1124",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 12,
                      width: 440,
                      maxWidth: "100%",
                      maxHeight: "80vh",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: 14,
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <h2 style={{ margin: 0, fontSize: 15 }}>외계행성 선택</h2>
                      <button className="ghost" style={{ marginLeft: "auto" }} onClick={() => setPickerOpen(false)}>
                        닫기
                      </button>
                    </div>
                    <div style={{ padding: "14px 14px 8px" }}>
                      <input
                        type="text"
                        placeholder="이름/항성명으로 좁히기…"
                        value={pickerQuery}
                        onChange={(e) => setPickerQuery(e.target.value)}
                        style={{ width: "100%" }}
                        autoFocus
                      />
                    </div>
                    <div style={{ overflowY: "auto", padding: "0 14px 8px" }}>
                      {pickerList.map((p) => {
                        const ready =
                          p.orbitalPeriodDays != null &&
                          p.radiusEarth != null &&
                          p.stellarTeffK != null &&
                          p.stellarMassSun != null;
                        return (
                          <div
                            key={p.name}
                            onClick={() => pickPlanet(p)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "8px 6px",
                              borderBottom: "1px solid rgba(255,255,255,0.05)",
                              cursor: "pointer",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <span
                              title={ready ? "예측 가능(4개 값 모두 있음)" : "값 일부 없음"}
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: "50%",
                                background: ready ? "#4ecdc4" : "#5a627a",
                                flexShrink: 0,
                              }}
                            />
                            <span style={{ fontSize: 13 }}>{p.name}</span>
                            <span className="muted" style={{ fontSize: 11, marginLeft: "auto" }}>
                              {p.hostname}
                            </span>
                          </div>
                        );
                      })}
                      {pickerList.length === 0 && !pickerLoading && (
                        <div className="muted" style={{ padding: 12 }}>결과 없음</div>
                      )}
                      {pickerHasMore && (
                        <div style={{ textAlign: "center", marginTop: 10 }}>
                          <button
                            className="ghost"
                            disabled={pickerLoading}
                            onClick={() => loadPicker(pickerPage + 1, pickerQuery, true)}
                          >
                            {pickerLoading ? "불러오는 중…" : "더보기"}
                          </button>
                        </div>
                      )}
                    </div>
                    <div
                      className="muted"
                      style={{
                        padding: "8px 14px",
                        borderTop: "1px solid rgba(255,255,255,0.08)",
                        fontSize: 11,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: "#4ecdc4",
                          marginRight: 6,
                        }}
                      />
                      = 예측 가능(4개 값 모두 있음)
                    </div>
                  </div>
                </div>,
                document.body
              )}
            </div>
          )}
        </>
      )}

      {tab === "apod" && (
        <div className="card section">
          <div className="head">
            <h2>오늘의 천문사진</h2>
            <div className="actions">
              {apod && (
                <button disabled={translating} onClick={toggleLang}>
                  {translating ? "번역 중…" : showKo ? "English" : "한국어"}
                </button>
              )}
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
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
                  {showKo && apod.titleKo ? apod.titleKo : apod.title}
                </div>
                <div className="muted" style={{ marginBottom: 10 }}>{apod.date}</div>
                <p className="muted">
                  {showKo && apod.explanationKo ? apod.explanationKo : apod.explanation}
                </p>
                {/* 작성자(copyright)는 항상 영어 원문 유지 */}
                {apod.copyright && <div className="muted">© {apod.copyright}</div>}
              </div>
            </div>
          ) : (
            <div className="muted">
              저장된 천문사진이 없습니다. ‘오늘의 사진’으로 수집하면 Elasticsearch에 저장됩니다.
            </div>
          )}

          {apods.length > 0 && (
            <>
              <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
                <span className="muted" style={{ fontSize: 12 }}>{apods.length}장</span>
              </div>

              <div className="gallery" style={{ marginTop: 12 }}>
                {apods.map((a) => (
                  <div className="thumb" key={a.date} onClick={() => selectApod(a)} title={a.title}>
                    {a.mediaType === "image" ? (
                      <img src={a.url} alt={a.title} loading="lazy" />
                    ) : (
                      <div style={{ height: 88, display: "grid", placeItems: "center" }}>VIDEO</div>
                    )}
                    {/* 번역 캐시가 있으면 배지 표시 */}
                    {a.titleKo && (
                      <span
                        style={{
                          position: "absolute",
                          top: 6,
                          right: 6,
                          fontSize: 10,
                          fontWeight: 600,
                          padding: "1px 5px",
                          borderRadius: 6,
                          background: "rgba(0,0,0,0.6)",
                          color: "#fff",
                        }}
                      >
                        한
                      </span>
                    )}
                    <div className="cap">{a.date}</div>
                  </div>
                ))}
              </div>

              {hasMore && (
                <div style={{ marginTop: 12, textAlign: "center" }}>
                  <button className="ghost" disabled={loadingMore} onClick={loadMore}>
                    {loadingMore ? "불러오는 중…" : "더보기"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === "neo" && <NeoPanel />}
    </div>
  );
}
