from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import and_, or_

from agora_analysis_worker_shared.generated_models import Opinion, User

if TYPE_CHECKING:
    from sqlalchemy.sql.elements import ColumnElement


def current_opinion_source_condition() -> ColumnElement[bool]:
    """User must be joined through Opinion.author_id, not the voter."""
    return and_(
        Opinion.current_content_id.is_not(None),
        or_(Opinion.is_seed.is_(True), User.is_deleted.is_(False)),
    )
