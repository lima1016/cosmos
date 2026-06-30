"""processed.exoplanet 토픽을 백그라운드 스레드로 소비해 store 에 누적."""
import json
import threading

from kafka import KafkaConsumer

from . import config
from .store import store


def _consume_loop() -> None:
    try:
        consumer = KafkaConsumer(
            config.PROCESSED_TOPIC,
            bootstrap_servers=config.KAFKA_BOOTSTRAP_SERVERS,
            group_id="ai-service",
            auto_offset_reset="earliest",
            enable_auto_commit=True,
            value_deserializer=lambda v: json.loads(v.decode("utf-8")),
        )
    except Exception as exc:  # noqa: BLE001
        print(f"[kafka] consumer 연결 실패(스킵): {exc}")
        return

    print(f"[kafka] '{config.PROCESSED_TOPIC}' 구독 시작")
    for message in consumer:
        record = message.value
        if isinstance(record, dict):
            store.upsert(record)


def start_consumer() -> None:
    thread = threading.Thread(target=_consume_loop, name="kafka-consumer", daemon=True)
    thread.start()
