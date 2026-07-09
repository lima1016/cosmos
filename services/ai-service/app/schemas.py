from typing import Optional

from pydantic import BaseModel


class PredictRequest(BaseModel):
    orbitalPeriodDays: float
    radiusEarth: float
    stellarTeffK: float
    stellarMassSun: float


class PredictResponse(BaseModel):
    massEarth: Optional[float] = None
    stellarAgeGyr: Optional[float] = None
    note: str = ""


class TrainResponse(BaseModel):
    trained: bool
    samples: int
    metrics: dict


class StatusResponse(BaseModel):
    collected_records: int
    models_trained: list[str]


class TranslateRequest(BaseModel):
    title: str
    explanation: str


class TranslateResponse(BaseModel):
    titleKo: str
    explanationKo: str
