from sqlalchemy.dialects import postgresql

from import_worker.generated_models import Conversation, EventSlug, VoteContent, VoteEnumAll


def test_generated_sqlalchemy_enums_bind_database_values() -> None:
    dialect = postgresql.dialect()

    vote_processor = VoteContent.__table__.c.vote.type.bind_processor(dialect)
    event_processor = Conversation.__table__.c.requires_event_ticket.type.bind_processor(dialect)

    assert vote_processor is not None
    assert event_processor is not None
    assert vote_processor(VoteEnumAll.pass_) == "pass"
    assert vote_processor("pass") == "pass"
    assert event_processor(EventSlug.devconnect_2025) == "devconnect-2025"
    assert event_processor("devconnect-2025") == "devconnect-2025"
