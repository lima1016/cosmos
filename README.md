# 🌌 Cosmos — NASA 데이터 기반 천문학 탐구 플랫폼

NASA Open API에서 천문 데이터를 수집해 Kafka로 흘려보내고, 가공·색인·캐싱한 뒤
AI로 행성의 나이·거리를 분석하여 대시보드로 시각화하는 MSA 프로젝트.

## 아키텍처

```
 NASA APIs ─► ingestion-service ─► Kafka ─► core-service ─► PostgreSQL / Elasticsearch / Redis
 (Exoplanet)      (Java)          (raw.*)    (Java)              │
                                                                 │ processed.exoplanet
                                                                 ▼
                                                          ai-service (Python/FastAPI)
                                                          행성 나이·거리 회귀 모델

 [브라우저] ─► Nginx(8080) ─┬─► /api/exoplanets → core-service
   (frontend)              ├─► /api/ingest     → ingestion-service
                           └─► /api/ai         → ai-service
```

| 구성요소 | 언어/기술 | 역할 | 포트 |
|----------|-----------|------|------|
| `ingestion-service` | Java / Spring Boot | NASA API 수집(backfill·증분·리플레이) → Kafka produce | 8081 |
| `core-service` | Java / Spring Boot | Kafka consume → 가공 → PG/ES/Redis 저장, 조회 API | 8082 |
| `ai-service` | Python / FastAPI | 학습/추론(행성 나이·거리 회귀), 예측 API | 8000 |
| `frontend` | React / Vite | 대시보드 시각화 | 5173 |
| `nginx` | Nginx | 단일 진입점(리버스 프록시) | 8080 |

### 스택
- **Java 25 / Spring Boot 4.1 / Gradle 멀티모듈** (루트가 부모, `services/*`가 하위 모듈)
- 패키지: `com.lima.cosmos.*`
- 단일 진입점은 **Nginx**. (Spring Cloud Gateway는 아직 Boot 4.x 미지원이라 미사용 —
  Kafka·ES·Redis 스타터는 Boot BOM에 포함돼 4.1과 호환됨)

## 인프라 (docker-compose)

| 컴포넌트 | 포트 | 비고 |
|----------|------|------|
| Kafka (KRaft) | 9092 | 호스트에서 `localhost:9092` |
| Kafka UI | 8085 | http://localhost:8085 |
| PostgreSQL | 5432 | db: `cosmos` / user: `cosmos` / pw: `cosmos` |
| Elasticsearch | 9200 | 보안 비활성(개발용) |
| Redis | 6379 | |
| Nginx | 8080 | API 단일 진입점 |

## 빠른 시작

```bash
# 1) 인프라 + Nginx 기동
docker compose up -d

# 2) Java 서비스 (루트의 Gradle 래퍼 사용, JDK 25)
./gradlew :services:ingestion-service:bootRun
./gradlew :services:core-service:bootRun
#   Windows: gradlew.bat :services:core-service:bootRun

# 3) AI 서비스 (Python 3.11+)
cd services/ai-service
python -m venv .venv && .venv\Scripts\activate   # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 4) 프론트엔드
cd frontend && npm install && npm run dev
```

> Nginx 컨테이너는 `host.docker.internal` 로 호스트에서 실행 중인 Java/Python 서비스에 접근한다.
> (Docker Desktop on Windows/Mac 기본 지원)

## 데이터 흐름 검증 (Exoplanet 수직 슬라이스)

```bash
# 전체 수집: NASA → Kafka(raw.exoplanet) → core-service 소비 → PG/ES/Redis 저장
curl -X POST http://localhost:8080/api/ingest/exoplanet

# 발견연도순 타임라인 리플레이 (대시보드 애니메이션용)
curl -X POST http://localhost:8080/api/ingest/exoplanet/replay

# 저장된 데이터/통계 조회
curl http://localhost:8080/api/exoplanets?size=20
curl http://localhost:8080/api/exoplanets/stats

# AI 모델 학습 & 예측
curl -X POST http://localhost:8080/api/ai/train
curl -X POST http://localhost:8080/api/ai/predict -H "Content-Type: application/json" \
  -d '{"orbitalPeriodDays": 365.25, "radiusEarth": 1.0, "massEarth": 1.0, "stellarTeffK": 5778, "stellarMassSun": 1.0}'
```

## Kafka 활용 포인트 (정적 데이터인데 왜 Kafka?)

NASA Exoplanet 데이터는 실시간이 아니지만, Kafka는 다음을 위해 쓴다:
- **디커플링**: 수집 속도와 가공 속도 분리 (NASA API 장애·rate limit에도 버퍼링)
- **리플레이**: 가공 로직을 바꾸면 offset을 되돌려 전체 재처리
- **fan-out**: 같은 `processed.exoplanet`을 core·ai-service가 각자 소비
- **타임라인 리플레이**: 발견연도순으로 흘려보내 정적 데이터를 스트림처럼 시각화

확장 아이디어: NeoWs(근지구 천체)·DONKI(우주기상) 같은 **실시간성 소스**를 토픽으로 추가.

## NASA API 키

Exoplanet Archive TAP API는 키가 필요 없다.
APOD·NeoWs 등 다른 소스를 추가할 땐 https://api.nasa.gov 에서 무료 키를 발급받아
`.env`의 `NASA_API_KEY`에 넣는다.
