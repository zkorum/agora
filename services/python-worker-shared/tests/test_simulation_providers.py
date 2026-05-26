from __future__ import annotations

import logging

import pytest

from agora_worker_shared.ai_description_work import (
    ClaimedDescriptionTranslationWorkItem,
    ClaimedLineageDescriptionWorkItem,
)
from agora_worker_shared.config import Settings
from agora_worker_shared.description_input import (
    ConversationDescriptionInput,
    DescriptionInputError,
    GroupDescriptionInput,
)
from agora_worker_shared.description_services import (
    build_description_generator,
    build_description_translator,
)
from agora_worker_shared.description_translation import DescriptionForTranslation
from agora_worker_shared.simulation_providers import (
    SimulationRuntime,
    emit_load_event,
    generate_simulated_description_translations,
    generate_simulated_label_summaries,
    maybe_raise_simulated_claim_error,
)

VALID_DSN = "postgresql://user:password@localhost:5432/agora"


def test_normal_mode_does_not_create_fake_providers() -> None:
    settings = Settings(connection_string=VALID_DSN)

    assert build_description_generator(settings) is None
    assert build_description_translator(settings) is None


def test_simulation_mode_creates_fake_providers_only_when_enabled() -> None:
    settings = Settings(
        agora_dev_mode=True,
        connection_string=VALID_DSN,
        simulation_providers_enable=True,
        ai_description_simulation_mode="success",
        description_translation_simulation_mode="success",
    )

    assert build_description_generator(settings) is not None
    assert build_description_translator(settings) is not None


def test_generate_simulated_label_summaries_returns_group_outputs() -> None:
    output = generate_simulated_label_summaries(
        ConversationDescriptionInput(
            conversation_title="Question?",
            conversation_body=None,
            groups=[GroupDescriptionInput(group_key="0", representative_opinions=[])],
        )
    )

    assert output.mode == "simulation"
    assert output.clusters["0"].label == "Sim Group 0"


def test_generate_simulated_description_translations_returns_matching_locale() -> None:
    translations = generate_simulated_description_translations(
        [DescriptionForTranslation(description_id=123, label="Sim Group 0", summary="Summary")],
        ["fr"],
    )

    assert len(translations) == 1
    assert translations[0].description_id == 123
    assert translations[0].locale == "fr"


def test_retryable_error_then_success_uses_attempt_threshold() -> None:
    runtime = SimulationRuntime(
        ai_description_mode="retryable_error_then_success",
        description_translation_mode="off",
        retryable_failure_attempts=1,
    )
    first_attempt = ClaimedLineageDescriptionWorkItem(
        id=1,
        conversation_id=10,
        conversation_slug_id="conversation-1",
        lineage_id=20,
        source_candidate_id=30,
        locale="en",
        attempt_count=1,
        lease_token="lease",
    )
    second_attempt = ClaimedLineageDescriptionWorkItem(
        id=1,
        conversation_id=10,
        conversation_slug_id="conversation-1",
        lineage_id=20,
        source_candidate_id=30,
        locale="en",
        attempt_count=2,
        lease_token="lease",
    )

    with pytest.raises(RuntimeError):
        maybe_raise_simulated_claim_error(
            runtime=runtime,
            claim=first_attempt,
            phase="test",
        )
    maybe_raise_simulated_claim_error(
        runtime=runtime,
        claim=second_attempt,
        phase="test",
    )


def test_non_retryable_translation_error_raises_description_input_error() -> None:
    runtime = SimulationRuntime(
        ai_description_mode="off",
        description_translation_mode="non_retryable_error",
        retryable_failure_attempts=1,
    )
    claim = ClaimedDescriptionTranslationWorkItem(
        id=1,
        conversation_id=10,
        conversation_slug_id="conversation-1",
        description_id=20,
        locale="fr",
        attempt_count=1,
        lease_token="lease",
    )

    with pytest.raises(DescriptionInputError):
        maybe_raise_simulated_claim_error(runtime=runtime, claim=claim, phase="test")


def test_emit_load_event_logs_json_marker(caplog: pytest.LogCaptureFixture) -> None:
    caplog.set_level(logging.INFO)

    emit_load_event(
        phase="test",
        action="simulation-provider",
        outcome="success",
        conversation_slug_id="conversation-1",
        metadata={"attemptCount": 1},
    )

    assert "AGORA_LOAD_EVENT" in caplog.text
    assert '"action":"simulation-provider"' in caplog.text
