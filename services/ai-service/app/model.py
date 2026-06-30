"""행성 거리/항성 나이 회귀 모델 학습 및 추론."""
import os
from typing import Dict, List, Optional

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

from . import config


class ModelService:
    def __init__(self) -> None:
        self._models: Dict[str, RandomForestRegressor] = {}
        self._load_existing()

    def _path(self, target: str) -> str:
        return os.path.join(config.MODEL_DIR, f"{target}.joblib")

    def _load_existing(self) -> None:
        for target in config.TARGETS:
            path = self._path(target)
            if os.path.exists(path):
                self._models[target] = joblib.load(path)
                print(f"[model] 기존 모델 로드: {target}")

    def trained_targets(self) -> List[str]:
        return list(self._models.keys())

    def train(self, records: List[dict]) -> Dict:
        os.makedirs(config.MODEL_DIR, exist_ok=True)
        df = pd.DataFrame(records)
        metrics: Dict[str, dict] = {}
        used_samples = 0

        for target in config.TARGETS:
            cols = config.FEATURES + [target]
            if not set(cols).issubset(df.columns):
                metrics[target] = {"error": "필요한 컬럼 없음"}
                continue

            data = df[cols].apply(pd.to_numeric, errors="coerce").dropna()
            if len(data) < 20:
                metrics[target] = {"error": f"학습 샘플 부족({len(data)})"}
                continue

            X = data[config.FEATURES].values
            y = data[target].values
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
            model = RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1)
            model.fit(X_train, y_train)
            pred = model.predict(X_test)

            self._models[target] = model
            joblib.dump(model, self._path(target))
            used_samples = max(used_samples, len(data))
            metrics[target] = {
                "samples": int(len(data)),
                "r2": round(float(r2_score(y_test, pred)), 4),
                "mae": round(float(mean_absolute_error(y_test, pred)), 4),
                "feature_importance": dict(
                    zip(config.FEATURES, np.round(model.feature_importances_, 4).tolist())
                ),
            }
            print(f"[model] 학습 완료 target={target} r2={metrics[target].get('r2')}")

        return {"samples": used_samples, "metrics": metrics}

    def predict(self, features: dict) -> Dict[str, Optional[float]]:
        x = np.array([[features[f] for f in config.FEATURES]])
        result: Dict[str, Optional[float]] = {}
        for target, model in self._models.items():
            result[target] = round(float(model.predict(x)[0]), 4)
        return result


model_service = ModelService()
