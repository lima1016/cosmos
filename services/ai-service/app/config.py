import os

from dotenv import load_dotenv

load_dotenv()

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
PROCESSED_TOPIC = os.getenv("PROCESSED_TOPIC", "processed.exoplanet")
PREDICTION_TOPIC = os.getenv("PREDICTION_TOPIC", "prediction.exoplanet")

# core-service 조회 API (학습 데이터 시드용)
CORE_SERVICE_URL = os.getenv("CORE_SERVICE_URL", "http://localhost:8082")

MODEL_DIR = os.getenv("MODEL_DIR", "models")

# 입력 피처(설명변수)와 예측 대상(타깃)
# distancePc(거리)는 행성 물리량이 아니라 관측 편향에 가까워 타깃에서 제외.
# 대신 질량–반지름 관계(massEarth)를 예측 → 물리적으로 의미 있는 회귀.
FEATURES = [
    "orbitalPeriodDays",
    "radiusEarth",
    "stellarTeffK",
    "stellarMassSun",
]
TARGETS = {
    "massEarth": "질량(지구=1)",
    "stellarAgeGyr": "항성 나이(Gyr)",
}
