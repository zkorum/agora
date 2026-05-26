# ---- Builder ----
FROM python:3.13-slim-bookworm AS builder
WORKDIR /build

RUN apt-get update && \
    apt-get install -y --no-install-recommends git build-essential python3-dev && \
    rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN python -m pip install --no-cache-dir --upgrade "pip>=26.1.1" "setuptools>=78.1.1" "wheel>=0.46.2"

COPY services/python-worker-shared/ services/python-worker-shared/
RUN pip install --no-cache-dir services/python-worker-shared

COPY services/description-translation-retry-worker/ services/description-translation-retry-worker/
RUN pip install --no-cache-dir --no-deps services/description-translation-retry-worker

# ---- Production ----
FROM python:3.13-slim-bookworm

RUN apt-get update && \
    apt-get install -y --no-install-recommends tini libgomp1 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

RUN groupadd --system --gid 1000 appuser && \
    useradd --system --uid 1000 --gid appuser appuser && \
    chown -R appuser:appuser /app
USER appuser

ENTRYPOINT ["tini", "--"]
CMD ["python", "-m", "description_translation_retry_worker.worker"]
