# 🌌 Cosmos — NASA 데이터 기반 천문학 탐구 플랫폼

https://github.com/user-attachments/assets/96343edc-59a3-42d5-9eb4-3922c0d2325c

NASA Open API에서 천문 데이터를 수집해 Kafka로 흘려보내고, 가공·색인·캐싱한 뒤
AI로 분석·번역하여 대시보드로 시각화하는 MSA 학습 프로젝트.

외계행성·오늘의 천문사진(APOD)·근지구 천체(NeoWs)를 다루며, 3D 태양계를 홈으로 둔다.

## 화면 (frontend)

상위 탭은 **주제(데이터 소스)별**로 나뉜다.

| 탭 | 내용 |
|----|------|
| **태양계** (홈) | 3D 실사 텍스처 태양계 |
| **외계행성** | 하위 탭 4개 — `성도`(3D 항성 지도) · `통계`(연도별 발견·발견방법·유형·질량–반지름) · `데이터`(검색/표) · `AI 예측` |
| **천문사진** | 오늘의 APOD + 갤러리(더보기), **한국어 번역 토글** |
| **근지구 천체** | NeoWs 접근 목록 · 레이더 시각화 · 위험 소행성 필터 |
| 우주기상 · 미디어 검색 | 예정 |

전역 **용어사전**(📖)과 본문 인라인 용어 툴팁으로 초보자도 볼 수 있게 했다.

## 아키텍처

```
 NASA APIs ─► ingestion-service ─► Kafka ─────► core-service ─► PostgreSQL / Elasticsearch / Redis
 (Exoplanet·APOD·NeoWs) (Java)   raw.exoplanet    (Java)            │
                                 raw.apod                           │ processed.exoplanet
                                 raw.neo                            ▼
                                                            ai-service (Python/FastAPI)
                                                            ├─ 질량·항성나이 회귀 (RandomForest)
                                                            └─ APOD 영→한 번역 (NLLB-200, self-host)

 [브라우저] ─► Nginx(8080) ─┬─► /api/exoplanets → core-service
   (frontend)              ├─► /api/apod        → core-service (번역은 ai-service 위임)
                           ├─► /api/neo         → core-service
                           ├─► /api/ingest      → ingestion-service
                           └─► /api/ai          → ai-service
```

| 구성요소 | 언어/기술 | 역할 | 포트 |
|----------|-----------|------|------|
| `ingestion-service` | Java / Spring Boot | NASA API 수집(backfill·증분·리플레이) → Kafka produce | 8081 |
| `core-service` | Java / Spring Boot | Kafka consume → 가공 → PG/ES/Redis 저장, 조회 API | 8082 |
| `ai-service` | Python / FastAPI | 회귀 학습·추론 + APOD 번역, 예측/번역 API | 8000 |
| `frontend` | React / Vite / Recharts / R3F | 대시보드·3D 시각화 | 5173 |
| `nginx` | Nginx | 단일 진입점(리버스 프록시) | 8080 |

### 스택
- **Java 25 / Spring Boot 4.1 / Gradle 멀티모듈** (루트가 부모, `services/*`가 하위 모듈)
- 패키지: `com.lima.cosmos.*`
- 단일 진입점은 **Nginx**. (Spring Cloud Gateway는 아직 Boot 4.x 미지원이라 미사용 —
  Kafka·ES·Redis 스타터는 Boot BOM에 포함돼 4.1과 호환됨)
- 번역은 **self-host**(`facebook/nllb-200-distilled-600M`) — 외부 API·키·비용 없이 CPU 추론.
  첫 호출만 모델 로드로 느리고, 결과는 core-service가 ES에 캐시해 재번역하지 않음.

## 인프라 (docker-compose)

| 컴포넌트 | 포트 | 비고 |
|----------|------|------|
| Kafka (KRaft) | 9092 | 호스트에서 `localhost:9092` |
| Kafka UI | 8085 | http://localhost:8085 |
| PostgreSQL | 5432 | db: `cosmos` / user: `cosmos` / pw: `cosmos` |
| Elasticsearch | 9200 | 9.4.2, 보안 비활성(개발용), 인덱스 영속화 |
| Kibana | 5601 | http://localhost:5601 (ES 조회 UI) |
| Redis | 6379 | |
| Nginx | 8080 | API 단일 진입점 |
| ai-service | 8000 | compose 로 빌드·기동(FastAPI) |

Kafka 토픽: `raw.exoplanet` · `raw.apod` · `raw.neo` · `processed.exoplanet` · `prediction.exoplanet`

## 빠른 시작

```bash
# 1) 인프라 + Nginx + ai-service 기동
docker compose up -d

# 2) Java 서비스 (루트의 Gradle 래퍼 사용, JDK 25)
./gradlew :services:ingestion-service:bootRun
./gradlew :services:core-service:bootRun
#   Windows: gradlew.bat :services:core-service:bootRun

# 3) 프론트엔드
cd frontend && npm install && npm run dev
```

> Nginx·ai-service 컨테이너는 `host.docker.internal` 로 호스트에서 실행 중인 Java 서비스에 접근한다.
> (Docker Desktop on Windows/Mac 기본 지원)
>
> ai-service 를 컨테이너 없이 로컬로 돌리려면:
> ```bash
> cd services/ai-service
> python -m venv .venv && .venv\Scripts\activate   # macOS/Linux: source .venv/bin/activate
> pip install -r requirements.txt
> uvicorn app.main:app --reload --port 8000
> ```

## 데이터 흐름 검증

모든 호출은 Nginx 단일 진입점(`localhost:8080`)을 통한다.

```bash
# 외계행성: NASA → Kafka(raw.exoplanet) → core-service 소비 → PG/ES/Redis 저장
curl -X POST http://localhost:8080/api/ingest/exoplanet
curl -X POST http://localhost:8080/api/ingest/exoplanet/replay   # 발견연도순 타임라인 리플레이
curl "http://localhost:8080/api/exoplanets?size=20"
curl http://localhost:8080/api/exoplanets/stats

# APOD(천문사진): 수집 → 조회 → 한국어 번역(캐시)
curl -X POST http://localhost:8080/api/ingest/apod
curl http://localhost:8080/api/apod/latest
curl -X POST "http://localhost:8080/api/apod/translate?date=2026-07-09"

# NeoWs(근지구 천체): 오늘~+6일 수집 → 다가오는 접근 조회
curl -X POST http://localhost:8080/api/ingest/neo
curl http://localhost:8080/api/neo/upcoming
curl http://localhost:8080/api/neo/hazardous

# AI: 반지름·공전주기·항성 특성 → 질량(⊕)·항성나이(Gyr) 회귀 예측
curl -X POST http://localhost:8080/api/ai/train
curl -X POST http://localhost:8080/api/ai/predict -H "Content-Type: application/json" \
  -d '{"orbitalPeriodDays": 365.25, "radiusEarth": 1.0, "stellarTeffK": 5778, "stellarMassSun": 1.0}'
```

## Kafka 활용 포인트 (정적 데이터인데 왜 Kafka?)

NASA Exoplanet 데이터는 실시간이 아니지만, Kafka는 다음을 위해 쓴다:
- **디커플링**: 수집 속도와 가공 속도 분리 (NASA API 장애·rate limit에도 버퍼링)
- **리플레이**: 가공 로직을 바꾸면 offset을 되돌려 전체 재처리
- **fan-out**: 같은 `processed.exoplanet`을 core·ai-service가 각자 소비
- **타임라인 리플레이**: 발견연도순으로 흘려보내 정적 데이터를 스트림처럼 시각화

확장 아이디어: DONKI(우주기상) 같은 **실시간성 소스**를 토픽으로 추가.

## API 한도 절약 (중복 수집 가드)

api.nasa.gov 토큰은 하루 호출 한도가 있어, **NASA 호출 전 core-service에 "이미 저장됐는지"를 먼저 물어본다.**
- APOD: `GET /api/apod/exists?date=…` → 있으면 NASA 호출 스킵
- NeoWs: `GET /api/neo/exists?date=…` → 동일
- 번역: 한 번 번역한 APOD는 ES에 캐시되어 재번역하지 않음

## NASA API 키

Exoplanet Archive TAP API는 키가 필요 없다.
APOD·NeoWs는 https://api.nasa.gov 에서 무료 키를 발급받아 `.env`의 `NASA_API_KEY`에 넣는다.