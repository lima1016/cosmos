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
FEATURES = [
    "orbitalPeriodDays",
    "radiusEarth",
    "massEarth",
    "stellarTeffK",
    "stellarMassSun",
]
TARGETS = {
    "distancePc": "거리(parsec)",
    "stellarAgeGyr": "항성 나이(Gyr)",
}
