from __future__ import annotations

import os
import subprocess
from pathlib import Path
from typing import TYPE_CHECKING

import pytest
from sqlalchemy import Engine, create_engine
from testcontainers.core.config import testcontainers_config
from testcontainers.postgres import PostgresContainer

if TYPE_CHECKING:
    from collections.abc import Generator


@pytest.fixture
def engine() -> Generator[Engine]:
    # Match the other Python workers' local Podman setup; every schema push below
    # targets only a fresh disposable test container, never the development DB.
    if not os.environ.get("DOCKER_HOST"):
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
            os.environ["DOCKER_HOST"] = f"unix://{result.stdout.strip()}"
        except (FileNotFoundError, subprocess.CalledProcessError):
            pass
    testcontainers_config.ryuk_disabled = True
    with PostgresContainer("postgres:16-alpine", driver="psycopg") as container:
        db = create_engine(container.get_connection_url(), hide_parameters=True)
        api = Path(__file__).resolve().parents[2] / "api"
        try:
            subprocess.run(
                [
                    str(api / "node_modules/.bin/tsx"),
                    "tests/pushCurrentSchema.ts",
                    container.get_connection_url().replace("postgresql+psycopg:", "postgresql:"),
                ],
                cwd=api,
                check=True,
                capture_output=True,
                text=True,
            )
            yield db
        finally:
            db.dispose()
