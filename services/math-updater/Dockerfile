# ---- Builder ----
FROM python:3.13-slim-bookworm AS builder
WORKDIR /app

ARG PIP_INSTALL_TARGET=.

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends git build-essential python3-dev && \
    rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN python -m pip install --no-cache-dir --upgrade "pip>=26.1.1" "setuptools>=78.1.1" "wheel>=0.46.2"

COPY services/shared-analysis-worker/ services/shared-analysis-worker/
RUN pip install --no-cache-dir "services/shared-analysis-worker[analysis]"

COPY services/math-updater/pyproject.toml services/math-updater/uv.lock ./
COPY services/math-updater/src/ src/
RUN pip install --no-cache-dir --no-deps "$PIP_INSTALL_TARGET"

# ---- Production ----
FROM python:3.13-slim-bookworm

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends tini libgomp1 && \
    rm -rf /var/lib/apt/lists/*

RUN python -m pip install --no-cache-dir --upgrade "pip>=26.1.1" "setuptools>=78.1.1" "wheel>=0.46.2"

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

RUN groupadd --system --gid 1000 appuser && \
    useradd --system --uid 1000 --gid appuser appuser && \
    chown -R appuser:appuser /app
USER appuser

STOPSIGNAL SIGTERM
ENTRYPOINT ["tini", "--"]
CMD ["python", "-m", "math_updater.worker"]
