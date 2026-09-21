# ---- Builder ----
FROM python:3.13-slim-bookworm AS builder
WORKDIR /app

ARG PIP_INSTALL_TARGET=.

# Builds have no TTY; noninteractive debconf avoids prompts and frontend fallback warnings.
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get upgrade -y && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends git build-essential python3-dev && \
    rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN python -m pip install --no-cache-dir --upgrade "pip>=26.1.1" "setuptools>=78.1.1" "wheel>=0.46.2"

COPY pyproject.toml uv.lock ./
COPY src/ src/
RUN pip install --no-cache-dir "$PIP_INSTALL_TARGET"

# ---- Production ----
FROM python:3.13-slim-bookworm

# Builds have no TTY; noninteractive debconf avoids prompts and frontend fallback warnings.
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get upgrade -y && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends tini && \
    rm -rf /var/lib/apt/lists/*

RUN python -m pip install --no-cache-dir --upgrade "pip>=26.1.1" "setuptools>=78.1.1" "wheel>=0.46.2"

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
COPY scripts/backfill_display_scores.py /app/scripts/backfill_display_scores.py
ENV PATH="/opt/venv/bin:$PATH"

RUN groupadd --system --gid 1000 appuser && \
    useradd --system --uid 1000 --gid appuser appuser && \
    chown -R appuser:appuser /app
USER appuser

STOPSIGNAL SIGTERM
ENTRYPOINT ["tini", "--"]
CMD ["python", "-m", "scoring_worker.worker"]
