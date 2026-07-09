// 천문학 용어 사전 — 단일 출처. 상단바 용어사전 모달이 이 데이터를 검색해 보여준다.
export interface GlossaryEntry {
  term: string; // 표제어
  cat: string; // 분류(그룹 표시용)
  aka?: string; // 약어·영문 등 검색 보조 키워드
  def: string; // 뜻(초보자용)
  example?: string; // 예시
}

// 인라인 툴팁용 조회: 표제어 시작/포함 또는 별칭 단어 일치로 항목을 찾는다.
export function findTerm(key: string): GlossaryEntry | undefined {
  const k = key.trim().toLowerCase();
  if (!k) return undefined;
  return (
    GLOSSARY.find((g) => g.term.toLowerCase() === k) ||
    GLOSSARY.find((g) => g.term.toLowerCase().startsWith(k)) ||
    GLOSSARY.find((g) => g.term.toLowerCase().includes(k)) ||
    GLOSSARY.find((g) => (g.aka?.toLowerCase().split(/\s+/).includes(k) ?? false))
  );
}

export const GLOSSARY: GlossaryEntry[] = [
  // ── 거리·단위 ──
  {
    term: "pc (파섹)",
    cat: "거리·단위",
    aka: "parsec 거리",
    def: "별까지의 거리 단위. 1파섹 ≈ 3.26광년 ≈ 약 31조 km.",
    example: "가까운 외계행성계는 보통 수~수십 pc 거리에 있어요.",
  },
  {
    term: "광년 (ly)",
    cat: "거리·단위",
    aka: "light year 거리",
    def: "빛이 1년 동안 가는 거리. 약 9.46조 km.",
  },
  {
    term: "AU (천문단위)",
    cat: "거리·단위",
    aka: "astronomical unit",
    def: "지구–태양 평균 거리. 약 1억 5천만 km. 태양계 안 거리를 잴 때 써요.",
  },
  {
    term: "Gyr (기가이어)",
    cat: "거리·단위",
    aka: "gigayear 나이 10억년 billion",
    def: "10억 년. 별의 나이처럼 아주 긴 시간을 나타내는 단위.",
    example: "태양의 나이 ≈ 4.6 Gyr = 46억 년.",
  },
  {
    term: "K (켈빈)",
    cat: "거리·단위",
    aka: "kelvin 온도 절대온도",
    def: "절대온도 단위. 0K = -273.15℃. 별의 표면온도를 잴 때 써요.",
    example: "태양 표면 ≈ 5,778K.",
  },
  {
    term: "달거리 (LD)",
    cat: "거리·단위",
    aka: "lunar distance 근접",
    def: "지구–달 평균 거리(약 38만 km). 소행성이 지구에 얼마나 가까이 왔는지 잴 때 써요.",
    example: "1 LD 안쪽으로 오면 달보다 더 가까이 스쳐간 거예요.",
  },
  {
    term: "⊕ (지구 기호)",
    cat: "거리·단위",
    aka: "earth symbol 지구=1",
    def: "질량·반지름을 '지구=1'로 나타낼 때 붙이는 기호. 예: 5⊕ = 지구의 5배.",
  },

  // ── 별(항성) ──
  {
    term: "항성 / 중심별",
    cat: "별(항성)",
    aka: "star host 별",
    def: "스스로 빛을 내는 별. '중심별'은 어떤 행성이 도는 그 별을 말해요(우리에겐 태양).",
  },
  {
    term: "항성온도 (teff)",
    cat: "별(항성)",
    aka: "effective temperature 표면온도 teffK",
    def: "별 표면의 유효 온도(K). 별의 '색'을 결정해요 — 뜨거우면 파랗고 차가우면 붉어요.",
    example: "태양 ≈ 5,778K(노랑). 3,000K대면 붉은 별.",
  },
  {
    term: "항성질량 (태양=1)",
    cat: "별(항성)",
    aka: "stellar mass 질량",
    def: "별의 질량을 태양=1로 나타낸 값. 2면 태양의 2배 무거운 별.",
  },
  {
    term: "별의 색 (흑체복사)",
    cat: "별(항성)",
    aka: "blackbody color 색온도",
    def: "별 색은 표면온도로 정해져요. 온도↑ → 청백색, 온도↓ → 적색. 실제 물리(흑체복사)예요.",
  },

  // ── 행성 ──
  {
    term: "외계행성",
    cat: "행성",
    aka: "exoplanet 행성",
    def: "태양계 밖에서 다른 별을 도는 행성.",
  },
  {
    term: "공전주기",
    cat: "행성",
    aka: "orbital period 주기 일",
    def: "행성이 중심별을 한 바퀴 도는 데 걸리는 시간(일). 지구는 365일.",
  },
  {
    term: "반지름 (지구=1)",
    cat: "행성",
    aka: "radius earth 크기",
    def: "행성 반지름을 지구=1로 나타낸 값. 11이면 지구 반지름의 11배(목성급).",
  },
  {
    term: "질량 (지구=1)",
    cat: "행성",
    aka: "mass earth 무게",
    def: "행성 질량을 지구=1로 나타낸 값.",
  },
  {
    term: "행성 유형",
    cat: "행성",
    aka: "planet type 암석형 슈퍼지구 해왕성형 목성형",
    def: "반지름 기준 분류 — 암석형(<1.25), 슈퍼지구(<2), 해왕성형(<6), 목성형(≥6). 단위는 지구=1.",
  },
  {
    term: "슈퍼지구",
    cat: "행성",
    aka: "super-earth",
    def: "지구보다 크고 해왕성보다 작은 행성. 지구와 비슷한 암석형일 수도, 아닐 수도 있어요.",
  },

  // ── 발견·관측 ──
  {
    term: "트랜싯 (Transit)",
    cat: "발견·관측",
    aka: "식 통과 발견방법",
    def: "행성이 별 앞을 지날 때 별빛이 살짝 어두워지는 걸 보고 행성을 찾는 방법. 가장 많이 쓰여요.",
  },
  {
    term: "시선속도 (Radial Velocity)",
    cat: "발견·관측",
    aka: "도플러 발견방법 흔들림",
    def: "행성 중력에 별이 미세하게 흔들리는 걸 별빛 색 변화로 잡아 행성을 찾는 방법.",
  },
  {
    term: "절대등급 (H)",
    cat: "발견·관측",
    aka: "absolute magnitude 밝기",
    def: "천체의 고유 밝기 지표. 소행성에선 값이 작을수록 더 크고 밝아요.",
  },

  // ── 소행성 (NEO) ──
  {
    term: "근지구천체 (NEO)",
    cat: "소행성(NEO)",
    aka: "near earth object 소행성 혜성",
    def: "지구 궤도 근처를 지나는 소행성·혜성. NASA NeoWs가 접근 정보를 제공해요.",
  },
  {
    term: "위험 소행성 (PHA)",
    cat: "소행성(NEO)",
    aka: "potentially hazardous 위험",
    def: "충분히 크고 지구에 충분히 가까이 접근해 '잠재적으로 위험'으로 분류된 근지구천체. 곧 충돌한다는 뜻은 아니에요.",
  },
  {
    term: "미스 거리 (miss distance)",
    cat: "소행성(NEO)",
    aka: "접근 거리",
    def: "소행성이 지구에 가장 가까이 왔을 때의 거리. 달거리(LD)나 km로 표시해요.",
  },

  // ── 데이터·AI ──
  {
    term: "APOD",
    cat: "데이터·AI",
    aka: "astronomy picture of the day 천문사진",
    def: "NASA가 매일 올리는 '오늘의 천문사진'. 사진 + 천문학자의 설명이 함께 와요.",
  },
  {
    term: "AI 회귀 예측",
    cat: "데이터·AI",
    aka: "randomforest regression 머신러닝",
    def: "알려진 데이터로 학습해 숫자를 추정하는 방식. 이 앱은 반지름·공전주기·별 특성으로 행성 질량과 별 나이를 예측해요.",
  },

  // ── 앱 전수 커버 추가분 ──
  {
    term: "km/s",
    cat: "거리·단위",
    aka: "속도 킬로미터 초속 velocity",
    def: "1초에 몇 km를 가는지 나타내는 속도 단위. 소행성 접근 속도에 써요.",
    example: "근지구천체는 보통 초속 수~수십 km로 스쳐가요.",
  },
  {
    term: "태양",
    cat: "별(항성)",
    aka: "sun 중심별 기준",
    def: "우리 태양계의 중심별(표면 ≈5,778K). 다른 별·행성 크기를 잴 때 기준자로 써요.",
  },
  {
    term: "항성계",
    cat: "별(항성)",
    aka: "star system 행성계",
    def: "하나의 중심별과 그 별을 도는 행성들 전체. 우리에겐 태양계가 하나의 항성계예요.",
  },
  {
    term: "행성 (vs 항성)",
    cat: "행성",
    aka: "planet 항성 차이 별",
    def: "스스로 빛을 내지 않고 별 주위를 도는 천체. 반대로 '항성(별)'은 스스로 빛나요 — 자주 헷갈려요.",
  },
  {
    term: "발견 방법",
    cat: "발견·관측",
    aka: "discovery method 관측 기법",
    def: "외계행성을 찾아낸 관측 기법. 대표적으로 트랜싯(식)과 시선속도(도플러)가 있어요.",
  },
  {
    term: "누적 발견",
    cat: "발견·관측",
    aka: "cumulative 누적 추이",
    def: "그 해까지 발견된 외계행성의 총합. 매년 더해가며 '탐사가 얼마나 가속됐는지' 보여줘요.",
  },
  {
    term: "소행성",
    cat: "소행성(NEO)",
    aka: "asteroid 암석",
    def: "태양을 도는 작은 암석 천체. 대부분 화성~목성 사이에 있지만 지구 근처로 오는 것도 있어요(근지구천체).",
  },
  {
    term: "접근일",
    cat: "소행성(NEO)",
    aka: "close approach date 접근",
    def: "근지구천체가 지구에 가장 가까이 다가오는 날짜.",
  },
  {
    term: "질량–반지름 관계",
    cat: "데이터·AI",
    aka: "mass radius relation 산점도",
    def: "행성의 크기(반지름)와 무게(질량) 사이의 통계적 관계. 이 앱 AI가 크기로 질량을 추정할 때 학습하는 바탕이에요.",
  },
  {
    term: "로그 스케일",
    cat: "데이터·AI",
    aka: "log scale 축 눈금",
    def: "축 눈금이 1·10·100처럼 몇 배씩 커지는 방식. 아주 작은 값과 큰 값을 한 화면에 같이 보여줄 때 써요.",
  },
  {
    term: "성도 (3D 성도)",
    cat: "지도·시각화",
    aka: "star map 별지도 하늘지도",
    def: "별들의 위치를 그린 하늘 지도. 이 앱은 실제 방향·거리로 별을 3D로 배치해요.",
  },
  {
    term: "태양계",
    cat: "지도·시각화",
    aka: "solar system 행성",
    def: "태양과 그 중력에 묶여 도는 행성·소행성 등 전체. 행성은 수성·금성·지구·화성·목성·토성·천왕성·해왕성 8개.",
  },
];
