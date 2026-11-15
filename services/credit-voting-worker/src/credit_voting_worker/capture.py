from __future__ import annotations

from typing import TYPE_CHECKING, TypedDict
from uuid import uuid4

from sqlalchemy import insert, select, update
from sqlalchemy.orm import Session

from credit_voting_worker.generated_models import (
    Conversation,
    CreditVotingConfig,
    QvAllocation,
    QvCalculation,
    QvCalculationState,
    QvInputAllocation,
    QvInputBallot,
    QvInputItem,
    QvInputSnapshot,
    QvResponseVersion,
    RankingItem,
    RankingItemContent,
)
from credit_voting_worker.generated_rules import (
    CREDIT_VOTING_ALGORITHM_VERSION,
    CREDIT_VOTING_RULE_VERSION,
)
from credit_voting_worker.inputs import (
    eligible_response_query,
    load_required_survey,
    survey_eligible_accounts,
)
from credit_voting_worker.work import Claim, InvalidInputError, lock_claim, renew_claim

if TYPE_CHECKING:
    from collections.abc import Callable
    from uuid import UUID

    from sqlalchemy import Engine


class InputBallotRow(TypedDict):
    snapshot_id: UUID
    ballot_index: int


class InputAllocationRow(InputBallotRow):
    item_slug_id: str
    votes: int


def capture_inputs(
    *, engine: Engine, claim: Claim, lease_seconds: int, should_stop: Callable[[], bool]
) -> UUID | None:
    with (
        engine.connect().execution_options(isolation_level="REPEATABLE READ") as connection,
        Session(connection) as session,
        session.begin(),
    ):
        if should_stop():
            raise InterruptedError("QV capture stopped")
        job = lock_claim(session=session, claim=claim)
        if job is None:
            return None
        if job.input_snapshot_id is not None:
            renew_claim(session=session, claim=claim, lease_seconds=lease_seconds)
            return job.input_snapshot_id
        active = session.scalar(
            select(Conversation.id)
            .join(
                QvCalculationState,
                QvCalculationState.conversation_id == Conversation.id,
            )
            .where(
                Conversation.id == claim.conversation_id,
                Conversation.is_closed.is_(True),
                Conversation.prioritization_type == "qv",
                Conversation.is_importing.is_(False),
                Conversation.current_content_id.is_not(None),
                QvCalculationState.generation == claim.generation,
            )
        )
        if active is None:
            return None
        config = session.scalars(
            select(CreditVotingConfig)
            .join(
                Conversation,
                Conversation.credit_voting_config_id == CreditVotingConfig.id,
            )
            .where(Conversation.id == claim.conversation_id)
        ).one()
        items = (
            session.execute(
                select(RankingItem, RankingItemContent)
                .join(
                    RankingItemContent,
                    RankingItemContent.id == RankingItem.current_content_id,
                )
                .where(
                    RankingItem.conversation_id == claim.conversation_id,
                    RankingItem.is_seed.is_(True),
                    RankingItem.deleted_at.is_(None),
                    RankingItem.account_hidden_at.is_(None),
                )
                .order_by(RankingItem.position, RankingItem.id)
            )
            .tuples()
            .all()
        )
        snapshot_id = uuid4()
        session.execute(
            insert(QvInputSnapshot).values(
                id=snapshot_id,
                calculation_id=claim.calculation_id,
                credit_budget=config.credit_budget,
                credit_pricing="quadratic",
                allow_opposition=config.allow_opposition,
                statement_set_revision=config.statement_set_revision,
                rule_version=CREDIT_VOTING_RULE_VERSION,
                algorithm_version=CREDIT_VOTING_ALGORITHM_VERSION,
                participant_count=0,
            )
        )
        for offset in range(0, len(items), 1000):
            if should_stop():
                raise InterruptedError("QV capture stopped")
            session.execute(
                insert(QvInputItem).values(
                    [
                        {
                            "snapshot_id": snapshot_id,
                            "item_slug_id": item.slug_id,
                            "source_version": content.public_id,
                            "position": item.position,
                            "title": content.title,
                            "body": content.body,
                        }
                        for item, content in items[offset : offset + 1000]
                    ]
                )
            )
        item_by_id = {item.id: (item.slug_id, content.id) for item, content in items}
        survey = load_required_survey(session=session, conversation_id=claim.conversation_id)
        candidates = session.execute(
            eligible_response_query(conversation_id=claim.conversation_id).execution_options(
                yield_per=500
            )
        ).tuples()
        participant_count = 0
        for batch in candidates.partitions(500):
            if should_stop():
                raise InterruptedError("QV capture stopped")
            eligible_accounts = (
                None
                if survey is None
                else survey_eligible_accounts(
                    session=session,
                    conversation_id=claim.conversation_id,
                    config=survey,
                    account_ids=[account_id for _, _, account_id in batch],
                )
            )
            versions = [
                version_id
                for _, version_id, account_id in batch
                if eligible_accounts is None or account_id in eligible_accounts
            ]
            if not versions:
                continue
            version_rows = session.scalars(
                select(QvResponseVersion).where(QvResponseVersion.id.in_(versions))
            ).all()
            allocations = session.scalars(
                select(QvAllocation).where(QvAllocation.version_id.in_(versions))
            ).all()
            allocations_by_version: dict[UUID, list[QvAllocation]] = {}
            for allocation in allocations:
                allocations_by_version.setdefault(allocation.version_id, []).append(allocation)
            copied_allocations: list[InputAllocationRow] = []
            ballots: list[InputBallotRow] = []
            for version in version_rows:
                rows = allocations_by_version.get(version.id, [])
                if (
                    not rows
                    or version.credit_budget != config.credit_budget
                    or version.credit_pricing != "quadratic"
                    or version.allow_opposition != config.allow_opposition
                    or version.rule_version != CREDIT_VOTING_RULE_VERSION
                    or version.statement_set_revision != config.statement_set_revision
                    or sum(row.votes**2 for row in rows) != version.credits_spent
                    or version.credits_spent > config.credit_budget
                ):
                    raise InvalidInputError("Unsupported QV ballot provenance")
                for row in rows:
                    item = item_by_id.get(row.item_id)
                    if (
                        item is None
                        or item[1] != row.content_id
                        or row.deleted_at is not None
                        or row.votes == 0
                        or row.votes**2 > config.credit_budget
                        or (row.votes < 0 and not config.allow_opposition)
                    ):
                        raise InvalidInputError("Unavailable QV ballot input")
                    copied_allocations.append(
                        {
                            "snapshot_id": snapshot_id,
                            "ballot_index": participant_count,
                            "item_slug_id": item[0],
                            "votes": row.votes,
                        }
                    )
                ballots.append({"snapshot_id": snapshot_id, "ballot_index": participant_count})
                participant_count += 1
            session.execute(insert(QvInputBallot).values(ballots))
            for offset in range(0, len(copied_allocations), 1000):
                session.execute(
                    insert(QvInputAllocation).values(copied_allocations[offset : offset + 1000])
                )
        session.execute(
            update(QvInputSnapshot)
            .where(QvInputSnapshot.id == snapshot_id)
            .values(participant_count=participant_count)
        )
        session.execute(
            update(QvCalculation)
            .where(QvCalculation.id == claim.calculation_id)
            .values(input_snapshot_id=snapshot_id)
        )
        renew_claim(session=session, claim=claim, lease_seconds=lease_seconds)
        return snapshot_id
