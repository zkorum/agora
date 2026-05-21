from import_worker.queue import extract_minimal_import_request


def test_extract_minimal_import_request_from_partial_payload() -> None:
    minimal = extract_minimal_import_request(
        {
            "importSlugId": "abc12345",
            "userId": "user-1",
            "type": "invalid",
        },
    )

    assert minimal is not None
    assert minimal.import_slug_id == "abc12345"
    assert minimal.user_id == "user-1"


def test_extract_minimal_import_request_returns_none_for_unusable_payload() -> None:
    assert extract_minimal_import_request({"type": "invalid"}) is None
