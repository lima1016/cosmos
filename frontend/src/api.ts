// 상대경로로 호출 → Vite dev 서버가 /api 를 Nginx(8080)로 프록시한다.
const GATEWAY = "";

export interface Stats {
  total: number;
  averageDistancePc: number | null;
  nearest: { name: string; distancePc: number }[];
  byDiscoveryMethod: Record<string, number>;
  byDiscoveryYear: Record<string, number>;
  byPlanetType: Record<string, number>; // 반지름 기준 유형 분포
}

export interface MassRadiusPoint {
  name: string;
  radiusEarth: number;
  massEarth: number;
}

export interface StarPosition {
  hostname: string;
  ra: number;
  dec: number;
  distancePc: number;
  stellarTeffK: number | null;
  planetCount: number;
}

export interface Planet {
  name: string;
  hostname: string;
  distancePc: number | null;
  orbitalPeriodDays: number | null;
  radiusEarth: number | null;
  massEarth: number | null;
  stellarAgeGyr: number | null;
  stellarTeffK: number | null;
  stellarMassSun: number | null;
  discYear: number | null;
  discoveryMethod: string | null;
}

export interface Paged<T> {
  content: T[];
  page?: { size: number; number: number; totalElements: number; totalPages: number };
}

export interface Apod {
  date: string;
  title: string;
  explanation: string;
  url: string;
  hdurl?: string;
  mediaType?: string;
  copyright?: string;
  // 한국어 번역(없을 수 있음 → 요청 시 서버가 번역·캐시). 작성자(copyright)는 번역 안 함.
  titleKo?: string | null;
  explanationKo?: string | null;
}

// 오늘의 APOD 수집 결과. calledNasaApi=false 면 이미 저장돼 있어 API 호출을 건너뛴 것.
export interface ApodIngestResult {
  date: string;
  source: "nasa" | "cache";
  calledNasaApi: boolean;
  title: string | null;
}

// 근지구 천체(NeoWs) 접근 1건.
export interface NeoApproach {
  id: string;
  neoId: string;
  name: string;
  hazardous: boolean;
  absoluteMagnitudeH: number | null;
  diameterMinKm: number | null;
  diameterMaxKm: number | null;
  closeApproachDate: string;
  relativeVelocityKmS: number | null;
  missDistanceKm: number | null;
  missDistanceLunar: number | null;
  missDistanceAstronomical: number | null;
}

export interface NeoIngestResult {
  startDate: string;
  endDate: string;
  produced: number;
  calledNasaApi: boolean;
  source: "nasa" | "cache";
}

export interface PredictInput {
  orbitalPeriodDays: number;
  radiusEarth: number;
  stellarTeffK: number;
  stellarMassSun: number;
}

export interface PredictResult {
  massEarth: number | null;
  stellarAgeGyr: number | null;
  note: string;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      // 서버가 보낸 친절한 메시지 우선. Spring은 message, FastAPI는 detail(문자열) 사용.
      if (body?.message) detail = body.message;
      else if (typeof body?.detail === "string") detail = body.detail;
    } catch {
      /* 본문 없음 */
    }
    throw new Error(detail);
  }
  return res.json();
}

export const api = {
  stats: () => fetch(`${GATEWAY}/api/exoplanets/stats`).then(json<Stats>),

  // 질량–반지름 산점도용 점 목록(질량·반지름 둘 다 있는 행성)
  massRadius: () =>
    fetch(`${GATEWAY}/api/exoplanets/mass-radius`).then(json<MassRadiusPoint[]>),

  // limit: 서버가 내려줄 별 개수 상한(가까운 순). 실제 표시 개수는 프론트 슬라이더로 필터.
  starMap: (limit = 2000) =>
    fetch(`${GATEWAY}/api/exoplanets/map?limit=${limit}`).then(json<StarPosition[]>),

  // DB에 저장된 외계행성 페이지 조회 (q: 이름/항성명 부분일치 검색)
  list: (page = 0, size = 15, q = "") =>
    fetch(
      `${GATEWAY}/api/exoplanets?page=${page}&size=${size}${
        q ? `&q=${encodeURIComponent(q)}` : ""
      }`
    ).then(json<Paged<Planet>>),

  system: (hostname: string) =>
    fetch(`${GATEWAY}/api/exoplanets/system?hostname=${encodeURIComponent(hostname)}`).then(
      json<Planet[]>
    ),

  backfill: () =>
    fetch(`${GATEWAY}/api/ingest/exoplanet`, { method: "POST" }).then(json),

  replay: () =>
    fetch(`${GATEWAY}/api/ingest/exoplanet/replay`, { method: "POST" }).then(json),

  trainAI: () =>
    fetch(`${GATEWAY}/api/ai/train`, { method: "POST" }).then(json),

  predict: (input: PredictInput) =>
    fetch(`${GATEWAY}/api/ai/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then(json<PredictResult>),

  // APOD: 오늘의 천문사진 수집(토큰 사용) 후 저장된 최신 1건 조회
  ingestApod: () =>
    fetch(`${GATEWAY}/api/ingest/apod`, { method: "POST" }).then(json<ApodIngestResult>),

  ingestApodRecent: (count = 5) =>
    fetch(`${GATEWAY}/api/ingest/apod/recent?count=${count}`, { method: "POST" }).then(json),

  apodLatest: async (): Promise<Apod | null> => {
    const res = await fetch(`${GATEWAY}/api/apod/latest`);
    if (res.status === 204) return null;
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  },

  // ES(apod 인덱스)에 저장된 천문사진 목록(24개 페이지, 최신순).
  // before(YYYY-MM-DD): 더보기 — 그 날짜보다 과거 24개.
  apodGallery: (before?: string) => {
    const qs = before ? `?before=${encodeURIComponent(before)}` : "";
    return fetch(`${GATEWAY}/api/apod${qs}`).then(json<Apod[]>);
  },

  // 해당 날짜 APOD 한국어 번역(제목·본문). 없으면 서버가 번역·캐시 후 반환.
  // 최초 호출은 모델 로드로 수 분 걸릴 수 있음(이후 즉시).
  translateApod: (date: string) =>
    fetch(`${GATEWAY}/api/apod/translate?date=${encodeURIComponent(date)}`, {
      method: "POST",
    }).then(json<Apod>),

  // NeoWs: 근지구 천체 수집(토큰 사용) 후 저장분 조회
  ingestNeo: (startDate?: string, endDate?: string) => {
    const q = new URLSearchParams();
    if (startDate) q.set("startDate", startDate);
    if (endDate) q.set("endDate", endDate);
    const qs = q.toString();
    return fetch(`${GATEWAY}/api/ingest/neo${qs ? `?${qs}` : ""}`, {
      method: "POST",
    }).then(json<NeoIngestResult>);
  },

  neoUpcoming: () => fetch(`${GATEWAY}/api/neo/upcoming`).then(json<NeoApproach[]>),
  neoHazardous: () => fetch(`${GATEWAY}/api/neo/hazardous`).then(json<NeoApproach[]>),
  // 파라미터 없으면 다가오는 접근(오늘 이후)만. from/to(YYYY-MM-DD) 지정 시 그 구간(과거 포함) 조회.
  neoList: (from?: string, to?: string) => {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    const qs = q.toString();
    return fetch(`${GATEWAY}/api/neo${qs ? `?${qs}` : ""}`).then(json<NeoApproach[]>);
  },
};
