"""행성 나이·거리 회귀를 담당하는 AI 서비스.

게이트웨이가 /api/ai/* → /* 로 리라이트하므로 엔드포인트는 루트(/train 등)에 둔다.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .kafka_consumer import start_consumer
from .model import model_service
from .schemas import (
    PredictRequest,
    PredictResponse,
    StatusResponse,
    TrainResponse,
)
from .store import store


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_consumer()  # 백그라운드 Kafka 소비 시작
    yield


app = FastAPI(title="Cosmos AI Service", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/status", response_model=StatusResponse)
def status():
    return StatusResponse(
        collected_records=store.size(),
        models_trained=model_service.trained_targets(),
    )


@app.post("/train", response_model=TrainResponse)
def train():
    if store.size() == 0:
        seeded = store.seed_from_core()
        print(f"[train] core-service 에서 {seeded}건 시드")
    records = store.all()
    if not records:
        raise HTTPException(status_code=400, detail="학습할 데이터가 없습니다. 먼저 수집을 실행하세요.")
    result = model_service.train(records)
    return TrainResponse(trained=True, samples=result["samples"], metrics=result["metrics"])


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if not model_service.trained_targets():
        raise HTTPException(status_code=400, detail="모델이 아직 학습되지 않았습니다. /train 을 먼저 호출하세요.")
    preds = model_service.predict(req.model_dump())
    return PredictResponse(
        massEarth=preds.get("massEarth"),
        stellarAgeGyr=preds.get("stellarAgeGyr"),
        note="RandomForest 회귀 예측값",
    )
