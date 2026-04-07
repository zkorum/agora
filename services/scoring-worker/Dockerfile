# ---- Builder ----
FROM python:3.13-slim-bookworm AS builder
WORKDIR /app

ARG PIP_INSTALL_TARGET=.

RUN apt-get update && \
    apt-get install -y --no-install-recommends git build-essential python3-dev && \
    rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY pyproject.toml uv.lock ./
COPY src/ src/
RUN pip install --no-cache-dir "$PIP_INSTALL_TARGET"

# ---- Production ----
FROM python:3.13-slim-bookworm

RUN apt-get update && \
    apt-get install -y --no-install-recommends tini && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

RUN groupadd --system --gid 1000 appuser && \
    useradd --system --uid 1000 --gid appuser appuser && \
    chown -R appuser:appuser /app
USER appuser

ENTRYPOINT ["tini", "--"]
CMD ["python", "-m", "scoring_worker.worker"]
