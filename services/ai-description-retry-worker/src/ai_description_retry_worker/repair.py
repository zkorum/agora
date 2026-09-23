from __future__ import annotations

import argparse
import json
import logging
from dataclasses import asdict
from typing import TYPE_CHECKING

from agora_analysis_worker_shared.config import (
    AiDescriptionWorkerSettings,
    validate_ai_description_config,
)
from agora_analysis_worker_shared.description_repair import (
    fetch_live_descriptions,
    replace_live_description,
)
from agora_analysis_worker_shared.description_repair_service import (
    ApplyDescriptionRepairs,
    FailedDescriptionReport,
    InspectDescriptions,
    inspect_or_repair_description,
)
from agora_analysis_worker_shared.description_services import (
    build_description_generator,
    build_description_language_detector,
)
from agora_analysis_worker_shared.generated_models import OpinionGroupDescription
from agora_analysis_worker_shared.logging_utils import LOG_FORMAT
from agora_analysis_worker_shared.postgres_engine import create_postgres_engine
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

log = logging.getLogger(__name__)

if TYPE_CHECKING:
    from agora_analysis_worker_shared.description_language import EnglishDescription
    from agora_analysis_worker_shared.description_repair import LiveDescription
    from agora_analysis_worker_shared.description_repair_service import DescriptionRepairMode


class RepairOptions(BaseModel):
    apply: bool = False
    conversation: str | None = None
    limit: int = Field(default=100, ge=1)
    batch_size: int = Field(default=25, ge=1, le=100)
    after_description_id: int = Field(default=0, ge=0)


def main() -> None:
    parser = argparse.ArgumentParser(description="Check or repair current live AI descriptions.")
    parser.add_argument(
        "--apply", action="store_true", help="Repair confirmed language or locale errors"
    )
    parser.add_argument("--conversation", help="Restrict to a conversation slug")
    parser.add_argument(
        "--limit", type=int, default=100, help="Maximum distinct descriptions to inspect"
    )
    parser.add_argument("--batch-size", type=int, default=25)
    parser.add_argument("--after-description-id", type=int, default=0)
    options = RepairOptions.model_validate(vars(parser.parse_args()))
    logging.basicConfig(level=logging.INFO, format=LOG_FORMAT)
    settings = AiDescriptionWorkerSettings()
    if options.apply:
        validate_ai_description_config(settings)
        if settings.ai_description_simulation_enabled:
            parser.error("Repair requires the real description provider, not simulation")
    secondary_detector = build_description_language_detector(settings)
    engine = create_postgres_engine(
        settings.connection_string,
        statement_timeout_seconds=settings.db_statement_timeout_seconds,
        idle_transaction_timeout_seconds=settings.db_idle_transaction_timeout_seconds,
        application_name="ai-description-repair",
    )

    def replace_description(
        *, original: LiveDescription, replacement: EnglishDescription
    ) -> int | None:
        return replace_live_description(engine, original=original, replacement=replacement)

    scanned = 0
    failures = 0
    cursor = options.after_description_id
    try:
        mode: DescriptionRepairMode = InspectDescriptions()
        if options.apply:
            generate = build_description_generator(settings, secondary_detector=secondary_detector)
            if generate is None:
                parser.error("AI description generation must be enabled for --apply")
            mode = ApplyDescriptionRepairs(generate=generate, replace=replace_description)
        with Session(engine) as session:
            ceiling = session.scalar(select(func.max(OpinionGroupDescription.id))) or 0
        while scanned < options.limit:
            with Session(engine) as session:
                originals = fetch_live_descriptions(
                    session,
                    conversation_slug_id=options.conversation,
                    after_description_id=cursor,
                    through_description_id=ceiling,
                    limit=min(options.batch_size, options.limit - scanned),
                )
            if not originals:
                break
            for original in originals:
                cursor = original.description_id
                scanned += 1
                report = inspect_or_repair_description(
                    original, mode=mode, secondary_detector=secondary_detector
                )
                if isinstance(report, FailedDescriptionReport):
                    failures += 1
                print(json.dumps(asdict(report), ensure_ascii=False))
        log.info(
            "Inspected %d descriptions; failures=%d resume_after_description_id=%d",
            scanned,
            failures,
            cursor,
        )
    finally:
        engine.dispose()
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
