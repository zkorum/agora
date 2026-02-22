# ---- Builder ----
FROM python:3.11.12-slim-bookworm AS builder
WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends git build-essential python3-dev && \
    rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY . .
RUN pip install --no-cache-dir .

# ---- Production ----
FROM python:3.11.12-slim-bookworm

RUN apt-get update && \
    apt-get install -y --no-install-recommends tini && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY main.py gunicorn.conf.py ./

RUN groupadd --system --gid 1000 appuser && \
    useradd --system --uid 1000 --gid appuser appuser && \
    chown -R appuser:appuser /app
USER appuser

EXPOSE 8004
ENTRYPOINT ["tini", "--"]
CMD ["gunicorn", "-c", "gunicorn.conf.py", "-b", "0.0.0.0:8004", "main:app"]
