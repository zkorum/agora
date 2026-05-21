from __future__ import annotations

from datetime import UTC, datetime, timedelta

from math_updater.ai_description_work import (
    LineageDescriptionWorkDemand,
    PendingLocaleStatusRow,
    RequiredLineageDescriptionRow,
    TranslationWorkDemand,
    lineage_description_work_demands_for_statuses,
    translation_work_demands_for_statuses,
)

NOW = datetime(2026, 5, 21, 12, 0, 0, tzinfo=UTC)


def _status(
    *,
    status_id: int,
    conversation_id: int = 10,
    locale: str = "en",
    next_run_at: datetime | None = NOW,
) -> PendingLocaleStatusRow:
    return PendingLocaleStatusRow(
        id=status_id,
        conversation_id=conversation_id,
        conversation_view_snapshot_id=100 + status_id,
        analysis_snapshot_result_id=200 + status_id,
        locale=locale,
        next_run_at=next_run_at,
    )


def test_lineage_description_work_demands_are_unique_and_skip_ready_lineages() -> None:
    later = NOW + timedelta(minutes=5)
    statuses = [
        _status(status_id=1, next_run_at=NOW),
        _status(status_id=2, next_run_at=later),
    ]

    demands = lineage_description_work_demands_for_statuses(
        statuses=statuses,
        lineage_rows_by_status_id={
            1: [
                RequiredLineageDescriptionRow(
                    lineage_id=10,
                    candidate_id=1000,
                    system_description_id=None,
                ),
                RequiredLineageDescriptionRow(
                    lineage_id=11,
                    candidate_id=1001,
                    system_description_id=9001,
                ),
            ],
            2: [
                RequiredLineageDescriptionRow(
                    lineage_id=10,
                    candidate_id=2000,
                    system_description_id=None,
                ),
                RequiredLineageDescriptionRow(
                    lineage_id=12,
                    candidate_id=2001,
                    system_description_id=None,
                ),
            ],
        },
    )

    assert demands == [
        LineageDescriptionWorkDemand(
            lineage_id=10,
            conversation_id=10,
            source_candidate_id=1000,
            next_run_at=NOW,
        ),
        LineageDescriptionWorkDemand(
            lineage_id=12,
            conversation_id=10,
            source_candidate_id=2001,
            next_run_at=later,
        ),
    ]


def test_translation_work_demands_are_unique_per_description_locale() -> None:
    statuses = [
        _status(status_id=1, locale="fr", next_run_at=NOW),
        _status(status_id=2, locale="fr", next_run_at=NOW + timedelta(minutes=5)),
        _status(status_id=3, locale="es", next_run_at=NOW + timedelta(minutes=10)),
    ]

    demands = translation_work_demands_for_statuses(
        statuses=statuses,
        description_ids_by_status_id={
            1: {10, 20},
            2: {10, 30},
            3: {10},
        },
        translated_description_ids_by_status_id={
            1: {20},
            2: set(),
            3: {10},
        },
    )

    assert demands == [
        TranslationWorkDemand(
            description_id=10,
            conversation_id=10,
            locale="fr",
            next_run_at=NOW,
        ),
        TranslationWorkDemand(
            description_id=30,
            conversation_id=10,
            locale="fr",
            next_run_at=NOW + timedelta(minutes=5),
        ),
    ]
