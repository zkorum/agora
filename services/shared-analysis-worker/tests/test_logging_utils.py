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

    assert summary == (
        "type=DBAPIError dbapi_type=DriverError connection_invalidated=true sqlstate=08006"
    )
    assert secret not in summary


def test_database_error_summary_includes_safe_constraint_location() -> None:
    class Diagnostic:
        schema_name = "public"
        table_name = "survey_aggregate_result"
        column_name = "full_count"
        constraint_name = "unsafe value with spaces"
        message_detail = "private failing row"

    class NotNullError(Exception):
        sqlstate = "23502"
        diag = Diagnostic()

    error = DBAPIError(
        "insert into survey_aggregate_result values (:secret)",
        {"secret": "private"},
        NotNullError("private"),
    )

    assert database_error_summary(error) == (
        "type=DBAPIError dbapi_type=NotNullError connection_invalidated=false "
        "sqlstate=23502 schema_name=public table_name=survey_aggregate_result "
        "column_name=full_count"
    )


def test_database_error_summary_rejects_log_injection_in_identifiers() -> None:
    class Diagnostic:
        schema_name = "public\nforged log"
        table_name = "x" * 64
        column_name = 'column"withquotes'
        constraint_name = None

    class DriverDiagnosticError(Exception):
        sqlstate = "23502"
        diag = Diagnostic()

    error = DBAPIError("secret SQL", {"private": "row"}, DriverDiagnosticError("secret"))
    assert database_error_summary(error) == (
        "type=DBAPIError dbapi_type=DriverDiagnosticError "
        "connection_invalidated=false sqlstate=23502"
    )
