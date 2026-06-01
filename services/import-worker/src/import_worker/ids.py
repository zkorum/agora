from __future__ import annotations

import base64
import secrets
import uuid


def generate_random_slug_id() -> str:
    return base64.urlsafe_b64encode(secrets.token_bytes(5)).decode("ascii").rstrip("=")


def generate_uuid() -> uuid.UUID:
    return uuid.uuid4()
