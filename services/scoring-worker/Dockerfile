# ---- Builder ----
FROM python:3.13-slim-bookworm AS builder
WORKDIR /app

ARG PIP_INSTALL_TARGET=.

# Builds have no TTY; noninteractive debconf avoids prompts and frontend fallback warnings.
RUN printf 'Acquire::Retries "3";\nAPT::Update::Error-Mode "any";\n' > /etc/apt/apt.conf.d/80-build-network && \
    apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get upgrade -y && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends ca-certificates git build-essential python3-dev && \
    dpkg --compare-versions "$(dpkg-query -W -f='${Version}' ca-certificates)" ge 20250419~deb12u2 && \
    rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
# The base installer can still trust compromised CAs; verify its replacement by hash.
RUN python -m pip install --no-cache-dir --disable-pip-version-check --upgrade \
    "pip @ https://files.pythonhosted.org/packages/3f/06/3e4420302363fbb71be3c7f35ce042f54bfca330e3e66b3a2e3c4cca579f/pip-26.2.2-py3-none-any.whl#sha256=fd7f4dfa8190e014013b9f08f3e973f4e4c26ffd179a204895533a7254813a70" && \
    python -m pip install --no-cache-dir --upgrade "setuptools>=78.1.1" "wheel>=0.46.2"

COPY pyproject.toml uv.lock ./
COPY src/ src/
RUN pip install --no-cache-dir "$PIP_INSTALL_TARGET"

# ---- Production ----
FROM python:3.13-slim-bookworm

# Builds have no TTY; noninteractive debconf avoids prompts and frontend fallback warnings.
RUN printf 'Acquire::Retries "3";\nAPT::Update::Error-Mode "any";\n' > /etc/apt/apt.conf.d/80-build-network && \
    apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get upgrade -y && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends ca-certificates tini && \
    dpkg --compare-versions "$(dpkg-query -W -f='${Version}' ca-certificates)" ge 20250419~deb12u2 && \
    rm -rf /var/lib/apt/lists/*

RUN python -m pip install --no-cache-dir --disable-pip-version-check --upgrade \
    "pip @ https://files.pythonhosted.org/packages/3f/06/3e4420302363fbb71be3c7f35ce042f54bfca330e3e66b3a2e3c4cca579f/pip-26.2.2-py3-none-any.whl#sha256=fd7f4dfa8190e014013b9f08f3e973f4e4c26ffd179a204895533a7254813a70"

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
