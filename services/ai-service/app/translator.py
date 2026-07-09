"""영어→한국어 번역 (self-host, 외부 API·키·비용 없음).

facebook/nllb-200-distilled-600M 가중치를 처음 호출 때 1회 다운로드/로드(싱글턴)한다.
- 가중치는 HF_HOME(=컨테이너 볼륨) 에 캐시되어 재빌드/재시작에도 재다운로드하지 않는다.
- CPU 추론. 첫 호출만 느리고(모델 로드), 그 뒤 결과는 core-service 가 ES에 캐시하므로 재번역 없음.
"""
import re
from functools import lru_cache

_MODEL = "facebook/nllb-200-distilled-600M"
_SRC = "eng_Latn"   # NLLB 언어코드: 영어
_TGT = "kor_Hang"   # NLLB 언어코드: 한국어(한글)


@lru_cache(maxsize=1)
def _pipe():
    # transformers/torch 는 무거우니 서버 기동이 아니라 첫 사용 시점까지 import 를 미룬다.
    from transformers import pipeline
    print(f"[translate] 모델 로드 시작: {_MODEL} (최초 1회, 다운로드 포함 시 수 분 소요)")
    p = pipeline("translation", model=_MODEL, src_lang=_SRC, tgt_lang=_TGT, max_length=512)
    print("[translate] 모델 로드 완료")
    return p


def _chunks(text: str):
    # 긴 본문은 문장 단위로 쪼갠다(모델 최대 길이 초과·품질 저하 방지).
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return [p for p in parts if p]


def translate_en_to_ko(text: str) -> str:
    if not text or not text.strip():
        return ""
    outs = _pipe()(_chunks(text))
    return " ".join(o["translation_text"] for o in outs)
