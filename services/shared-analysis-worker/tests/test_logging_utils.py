from sqlalchemy.exc import DBAPIError

from agora_analysis_worker_shared.logging_utils import database_error_summary


class DriverError(Exception):
    sqlstate = "08006"


def test_database_error_summary_omits_messages_and_parameters() -> None:
    secret = "database-password"
    error = DBAPIError(
        "select :password",
        {"password": secret},
        DriverError(secret),
        connection_invalidated=True,
    )

    summary = database_error_summary(error)

    assert summary == "type=DBAPIError dbapi_type=DriverError sqlstate=08006"
    assert secret not in summary
