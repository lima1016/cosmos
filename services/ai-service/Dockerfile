# Cosmos AI Service (FastAPI) 컨테이너 이미지
# 빌드:  docker build -t cosmos-ai-service .
# 실행:  docker run -p 8000:8000 cosmos-ai-service

FROM python:3.13-slim

# 파이썬 런타임 동작 최적화
#  - PYTHONDONTWRITEBYTECODE: .pyc 캐시 파일을 만들지 않음
#  - PYTHONUNBUFFERED: 로그를 버퍼링 없이 즉시 출력(컨테이너 로그에 바로 보이게)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    # HuggingFace 모델 캐시를 모델 볼륨(/app/models) 하위에 둔다 → 재빌드/재시작에도 재다운로드 안 함.
    HF_HOME=/app/models/hf

WORKDIR /app

# torch 는 CPU 전용 휠로 설치(기본 PyPI 판은 CUDA 포함이라 수 GB 더 큼).
RUN pip install --no-cache-dir torch==2.6.0 --index-url https://download.pytorch.org/whl/cpu

# 나머지 의존성 설치 (requirements.txt 가 안 바뀌면 이 레이어는 캐시 재사용 → 빌드 빨라짐)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 소스 복사
COPY app/ ./app/

# 학습된 모델 저장 디렉터리(config 의 MODEL_DIR 기본값 "models")
RUN mkdir -p models

EXPOSE 8000

# 운영 실행: reload 없이 uvicorn 으로 기동
# (Kafka/core-service 주소 등은 환경변수로 주입 → docker run -e 또는 compose environment)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
