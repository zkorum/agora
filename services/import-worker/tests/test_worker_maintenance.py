from concurrent.futures import Future
from unittest.mock import Mock, patch

import pytest

from import_worker.config import Settings
from import_worker.importer import ImportIdentity
from import_worker.queue import IMPORT_REQUEST_ADAPTER, ImportValkeyClient, PoppedImportBatch
from import_worker.worker import ConnectedImportQueue, ProcessedImport, run_worker


def test_saturated_ingestion_cannot_starve_completion_or_timeout_cleanup() -> None:
    request = IMPORT_REQUEST_ADAPTER.validate_python(
        {
            "type": "url",
            "importSlugId": "hung0001",
            "userId": "00000000-0000-4000-8000-000000000001",
            "actorUserId": "00000000-0000-4000-8000-000000000001",
            "projectId": 1,
            "didWrite": "did:test:import",
            "polisUrl": "https://pol.is/test",
            "formData": {
                "participationMode": "guest",
                "isIndexed": True,
                "languageTargetPolicy": {
                    "source": "conversation_override",
                    "dynamicTranslationEnabled": False,
                    "manualTargetLanguageCodes": [],
                },
            },
        },
    )
    hung_future: Future[ProcessedImport] = Future()
    queue = ConnectedImportQueue(client=Mock(spec=ImportValkeyClient), queue_depth=1)
    settings = Settings(
        connection_string="postgresql://localhost/test",
        max_batch_size=1,
        max_concurrency=1,
        stale_cleanup_every_n_flushes=1,
    )

    with (
        patch("import_worker.worker.signal.signal"),
        patch("import_worker.worker._create_primary_engine_with_retry"),
        patch("import_worker.worker.create_session_factory"),
        patch("import_worker.worker._create_google_language_detector", return_value=None),
        patch("import_worker.worker._connect_to_valkey_with_retry", return_value=queue),
        patch("import_worker.worker.ThreadPoolExecutor") as executor,
        patch("import_worker.worker.time.monotonic", side_effect=[0.0, 1.0, 2.0]),
        patch("import_worker.worker.time.sleep", side_effect=RuntimeError("end test loop")),
        patch(
            "import_worker.worker.pop_import_requests",
            return_value=PoppedImportBatch(requests=[request], invalid_items=[]),
        ) as poll,
        patch("import_worker.worker._push_ready_import_events") as complete,
        patch("import_worker.worker._push_stale_cleanup_events") as cleanup,
    ):
        executor.return_value.__enter__.return_value.submit.return_value = hung_future

        with pytest.raises(RuntimeError, match="end test loop"):
            run_worker(settings)

        assert poll.call_count == 1
        assert complete.call_count == 2
        assert cleanup.call_count == 2
        assert cleanup.call_args.kwargs["active_imports"] == frozenset(
            {
                ImportIdentity(slug_id="hung0001", user_id=request.actor_user_id),
            }
        )
