from __future__ import annotations

from botocore.exceptions import ConnectTimeoutError, ReadTimeoutError
from google.api_core.exceptions import DeadlineExceeded
from google.api_core.exceptions import RetryError as GoogleRetryError


def is_provider_timeout_error(error: BaseException) -> bool:
    seen: set[int] = set()
    stack: list[BaseException] = [error]
    while stack:
        current = stack.pop()
        current_id = id(current)
        if current_id in seen:
            continue
        seen.add(current_id)

        if isinstance(
            current,
            TimeoutError | ConnectTimeoutError | DeadlineExceeded | ReadTimeoutError,
        ):
            return True

        if isinstance(current, GoogleRetryError):
            cause = current.cause
            if isinstance(cause, BaseException):
                stack.append(cause)

        if current.__cause__ is not None:
            stack.append(current.__cause__)
        if current.__context__ is not None:
            stack.append(current.__context__)

    return False
