"""Kafka(processed.exoplanet)에서 흘러온 레코드를 메모리에 모으는 스레드세이프 저장소."""
import threading
from typing import Dict, List

import requests

from . import config


class RecordStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._records: Dict[str, dict] = {}

    def upsert(self, record: dict) -> None:
        name = record.get("name")
        if not name:
            return
        with self._lock:
            self._records[name] = record

    def all(self) -> List[dict]:
        with self._lock:
            return list(self._records.values())

    def size(self) -> int:
        with self._lock:
            return len(self._records)

    def seed_from_core(self) -> int:
        """저장소가 비어 있으면 core-service 조회 API로 초기 데이터를 채운다."""
        try:
            url = f"{config.CORE_SERVICE_URL}/api/exoplanets?page=0&size=5000"
            resp = requests.get(url, timeout=30)
            resp.raise_for_status()
            content = resp.json().get("content", [])
            for rec in content:
                self.upsert(rec)
            return len(content)
        except Exception as exc:  # noqa: BLE001
            print(f"[store] core-service 시드 실패: {exc}")
            return 0


store = RecordStore()
