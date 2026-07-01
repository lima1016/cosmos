// 상대경로로 호출 → Vite dev 서버가 /api 를 Nginx(8080)로 프록시한다.
const GATEWAY = "";

export interface Stats {
  total: number;
  averageDistancePc: number | null;
  nearest: { name: string; distancePc: number }[];
  byDiscoveryMethod: Record<string, number>;
  byDiscoveryYear: Record<string, number>;
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
}

// 오늘의 APOD 수집 결과. calledNasaApi=false 면 이미 저장돼 있어 API 호출을 건너뛴 것.
export interface ApodIngestResult {
  date: string;
  source: "nasa" | "cache";
  calledNasaApi: boolean;
  title: string | null;
}

export interface PredictInput {
  orbitalPeriodDays: number;
  radiusEarth: number;
  massEarth: number;
  stellarTeffK: number;
  stellarMassSun: number;
}

export interface PredictResult {
  distancePc: number | null;
  stellarAgeGyr: number | null;
  note: string;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.message) detail = body.message; // 서버가 보낸 친절한 메시지 우선
    } catch {
      /* 본문 없음 */
    }
    throw new Error(detail);
  }
  return res.json();
}

export const api = {
  stats: () => fetch(`${GATEWAY}/api/exoplanets/stats`).then(json<Stats>),

  // limit: 서버가 내려줄 별 개수 상한(가까운 순). 실제 표시 개수는 프론트 슬라이더로 필터.
  starMap: (limit = 2000) =>
    fetch(`${GATEWAY}/api/exoplanets/map?limit=${limit}`).then(json<StarPosition[]>),

  // DB에 저장된 외계행성 페이지 조회
  list: (page = 0, size = 15) =>
    fetch(`${GATEWAY}/api/exoplanets?page=${page}&size=${size}`).then(json<Paged<Planet>>),

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

  // ES(apod 인덱스)에 저장된 천문사진 목록
  apodGallery: () => fetch(`${GATEWAY}/api/apod`).then(json<Apod[]>),
};
