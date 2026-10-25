FROM python:3.13-slim-trixie AS build

WORKDIR /app/services/import-worker
# Builds have no TTY; noninteractive debconf avoids prompts and frontend fallback warnings.
RUN printf 'Acquire::Retries "3";\nAPT::Update::Error-Mode "any";\n' > /etc/apt/apt.conf.d/80-build-network && \
    apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get upgrade -y && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends ca-certificates git && \
    dpkg --compare-versions "$(dpkg-query -W -f='${Version}' ca-certificates)" ge 20250419+deb13u1 && \
    rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:0.13.4 /uv /usr/local/bin/uv
COPY services/shared-language/ ../shared-language/
COPY services/import-worker/pyproject.toml services/import-worker/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY services/import-worker/src ./src
RUN uv sync --frozen --no-dev --no-editable

FROM python:3.13-slim-trixie

# Builds have no TTY; noninteractive debconf avoids prompts and frontend fallback warnings.
RUN printf 'Acquire::Retries "3";\nAPT::Update::Error-Mode "any";\n' > /etc/apt/apt.conf.d/80-build-network && \
    apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get upgrade -y && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends ca-certificates tini && \
    dpkg --compare-versions "$(dpkg-query -W -f='${Version}' ca-certificates)" ge 20250419+deb13u1 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
# The base installer can still trust compromised CAs; verify its replacement by hash.
RUN python -m pip install --no-cache-dir --disable-pip-version-check --upgrade \
    "pip @ https://files.pythonhosted.org/packages/3f/06/3e4420302363fbb71be3c7f35ce042f54bfca330e3e66b3a2e3c4cca579f/pip-26.2.2-py3-none-any.whl#sha256=fd7f4dfa8190e014013b9f08f3e973f4e4c26ffd179a204895533a7254813a70"
COPY --from=build /app/services/import-worker/.venv ./.venv
ENV PATH="/app/.venv/bin:$PATH"
# Google Translation uses gRPC, whose bundled roots are independent of certifi.
ENV GRPC_DEFAULT_SSL_ROOTS_FILE_PATH="/etc/ssl/certs/ca-certificates.crt"
STOPSIGNAL SIGTERM
ENTRYPOINT ["tini", "--"]
CMD ["python", "-m", "import_worker.worker"]
