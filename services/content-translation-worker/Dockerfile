FROM python:3.13-slim AS build

WORKDIR /app
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends git && \
    rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:0.11.6 /uv /usr/local/bin/uv
COPY services/content-translation-worker/pyproject.toml services/content-translation-worker/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY services/content-translation-worker/src ./src
RUN uv sync --frozen --no-dev

FROM python:3.13-slim

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends tini && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app/.venv ./.venv
ENV PATH="/app/.venv/bin:$PATH"
STOPSIGNAL SIGTERM
ENTRYPOINT ["tini", "--"]
CMD ["python", "-m", "content_translation_worker.worker"]
