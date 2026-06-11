from __future__ import annotations

import pytest

from agora_analysis_worker_shared.analysis_compute import (
    ComputedOpinionGroup,
    ComputedRepresentativeOpinion,
)
from agora_analysis_worker_shared.description_input import (
    DescriptionInputError,
    build_group_description_input,
)
from agora_analysis_worker_shared.generated_models import VoteEnumSimple


def _group_with_representatives() -> ComputedOpinionGroup:
    return ComputedOpinionGroup(
        key="0",
        external_id=12,
        local_participant_indexes=[0, 1],
        representative_opinions=[
            ComputedRepresentativeOpinion(
                local_opinion_index=1,
                agreement_type=VoteEnumSimple.disagree,
                probability_agreement=0.8,
                num_agreement=2,
                raw_repness={},
            ),
            ComputedRepresentativeOpinion(
                local_opinion_index=0,
                agreement_type=VoteEnumSimple.agree,
                probability_agreement=0.9,
                num_agreement=3,
                raw_repness={},
            ),
        ],
        opinion_stats=[],
    )


def test_build_group_description_input_uses_representative_opinion_texts() -> None:
    description_input = build_group_description_input(
        group=_group_with_representatives(),
        opinion_id_by_local_index={0: 100, 1: 200},
        opinion_content_by_id={100: "Public transit should be free", 200: "Taxes are too high"},
    )

    assert description_input.group_key == "0"
    assert description_input.agrees_with == ["Public transit should be free"]
    assert description_input.disagrees_with == ["Taxes are too high"]
    assert [opinion.opinion_id for opinion in description_input.representative_opinions] == [
        100,
        200,
    ]


def test_build_group_description_input_requires_opinion_id_mapping() -> None:
    with pytest.raises(DescriptionInputError, match="missing opinion id"):
        build_group_description_input(
            group=_group_with_representatives(),
            opinion_id_by_local_index={0: 100},
            opinion_content_by_id={100: "Public transit should be free"},
        )


def test_build_group_description_input_requires_opinion_content() -> None:
    with pytest.raises(DescriptionInputError, match="missing opinion content"):
        build_group_description_input(
            group=_group_with_representatives(),
            opinion_id_by_local_index={0: 100, 1: 200},
            opinion_content_by_id={100: "Public transit should be free"},
        )


def test_build_group_description_input_requires_representative_opinions() -> None:
    with pytest.raises(DescriptionInputError, match="no representative opinions"):
        build_group_description_input(
            group=ComputedOpinionGroup(
                key="0",
                external_id=12,
                local_participant_indexes=[0, 1],
                representative_opinions=[],
                opinion_stats=[],
            ),
            opinion_id_by_local_index={0: 100},
            opinion_content_by_id={100: "Public transit should be free"},
        )
