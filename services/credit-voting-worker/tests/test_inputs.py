from __future__ import annotations

from typing import Literal
from uuid import uuid4

import pytest

from credit_voting_worker.generated_models import (
    CreditVotingConfig,
    QvAllocation,
    QvResponseVersion,
)
from credit_voting_worker.generated_rules import QV_RULE_VERSION
from credit_voting_worker.inputs import QvAllocationInput, QvItemInput, project_live_ballot
from credit_voting_worker.work import InvalidInputError


def config() -> CreditVotingConfig:
    return CreditVotingConfig(credit_budget=100, allow_opposition=True, statement_set_revision=0)


def version(*, credits_spent: int = 13) -> QvResponseVersion:
    return QvResponseVersion(
        id=uuid4(),
        credit_budget=100,
        credit_pricing="quadratic",
        allow_opposition=True,
        rule_version=QV_RULE_VERSION,
        statement_set_revision=0,
        credits_spent=credits_spent,
    )


def test_projection_keeps_signed_choices_and_spending_without_mutating_sources() -> None:
    ballot = version()
    allocations = (
        QvAllocation(item_id=1, content_id=10, votes=3, deleted_at=None),
        QvAllocation(item_id=2, content_id=20, votes=-2, deleted_at=None),
    )
    items = {
        1: QvItemInput(slug_id="first", content_id=10),
        2: QvItemInput(slug_id="second", content_id=20),
    }
    expected = (
        QvAllocationInput(item_slug_id="first", votes=3),
        QvAllocationInput(item_slug_id="second", votes=-2),
    )
    assert (
        project_live_ballot(version=ballot, allocations=allocations, config=config(), items=items)
        == expected
    )
    assert (
        project_live_ballot(
            version=ballot, allocations=allocations, config=config(), items={2: items[2]}
        )
        == expected[1:]
    )
    assert (
        project_live_ballot(version=ballot, allocations=allocations, config=config(), items=items)
        == expected
    )
    assert ballot.credits_spent == 13
    assert [(row.item_id, row.content_id, row.votes, row.deleted_at) for row in allocations] == [
        (1, 10, 3, None),
        (2, 20, -2, None),
    ]


@pytest.mark.parametrize("votes", [0, 11, -11])
def test_invalid_original_votes_fail_even_without_an_available_item(votes: int) -> None:
    with pytest.raises(InvalidInputError):
        project_live_ballot(
            version=version(credits_spent=votes**2),
            allocations=(QvAllocation(item_id=1, content_id=10, votes=votes, deleted_at=None),),
            config=config(),
            items={},
        )


@pytest.mark.parametrize(
    "damage",
    ["budget", "pricing", "opposition", "rule", "revision", "spending"],
)
def test_original_rule_provenance_is_checked_before_availability(
    damage: Literal["budget", "pricing", "opposition", "rule", "revision", "spending"],
) -> None:
    ballot = version(credits_spent=9)
    match damage:
        case "budget":
            ballot.credit_budget = 99
        case "pricing":
            ballot.credit_pricing = "linear"
        case "opposition":
            ballot.allow_opposition = False
        case "rule":
            ballot.rule_version = QV_RULE_VERSION + 1
        case "revision":
            ballot.statement_set_revision = 1
        case "spending":
            ballot.credits_spent = 8
    with pytest.raises(InvalidInputError, match="provenance"):
        project_live_ballot(
            version=ballot,
            allocations=(QvAllocation(item_id=1, content_id=10, votes=3, deleted_at=None),),
            config=config(),
            items={},
        )


def test_empty_original_ballot_is_not_treated_as_an_excluded_valid_ballot() -> None:
    with pytest.raises(InvalidInputError):
        project_live_ballot(version=version(), allocations=(), config=config(), items={})
