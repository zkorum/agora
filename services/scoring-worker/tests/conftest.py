"""Shared test fixtures.

Podman users can still set DOCKER_HOST manually before running tests:
  DOCKER_HOST="unix://$(podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}')" \
  uv run pytest
"""

from __future__ import annotations

import os
import subprocess

import pytest
import valkey as valkey_lib
from testcontainers.core.config import testcontainers_config
from testcontainers.core.container import DockerContainer
from testcontainers.core.wait_strategies import LogMessageWaitStrategy


def _configure_docker_host() -> None:
    if os.environ.get("DOCKER_HOST"):
        return

    try:
        result = subprocess.run(
            [
                "podman",
                "machine",
                "inspect",
                "--format",
                "{{.ConnectionInfo.PodmanSocket.Path}}",
            ],
            check=True,
            capture_output=True,
            text=True,
        )
    except (FileNotFoundError, subprocess.CalledProcessError):
        return

    socket_path = result.stdout.strip()
    if socket_path:
        os.environ["DOCKER_HOST"] = f"unix://{socket_path}"


_configure_docker_host()

# Disable Ryuk for Podman compatibility (must be set before any container starts)
testcontainers_config.ryuk_disabled = True


@pytest.fixture(scope="session")
def valkey_container():
    """Start a single Valkey container for the entire test session."""
    container = (
        DockerContainer("valkey/valkey:8")
        .with_exposed_ports(6379)
        .waiting_for(LogMessageWaitStrategy("Ready to accept connections"))
    )
    container.start()
    yield container
    container.stop()


@pytest.fixture(scope="session")
def valkey_url(valkey_container: DockerContainer) -> str:
    host = valkey_container.get_container_host_ip()
    port = valkey_container.get_exposed_port(6379)
    return f"valkey://{host}:{port}/0"


@pytest.fixture()
def vk(valkey_container: DockerContainer) -> valkey_lib.Valkey:
    """Per-test Valkey client with clean state."""
    host = valkey_container.get_container_host_ip()
    port = int(valkey_container.get_exposed_port(6379))
    client = valkey_lib.Valkey(host=host, port=port, decode_responses=True)
    client.flushall()
    yield client  # type: ignore[misc]
    client.flushall()
    client.close()
