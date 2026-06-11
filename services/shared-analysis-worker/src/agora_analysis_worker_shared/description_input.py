from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

from agora_analysis_worker_shared.generated_models import VoteEnumSimple

if TYPE_CHECKING:
    from agora_analysis_worker_shared.analysis_compute import ComputedOpinionGroup


class DescriptionInputError(RuntimeError):
    pass


class DescriptionOutputError(RuntimeError):
    pass


@dataclass(frozen=True)
class RepresentativeOpinionText:
    opinion_id: int
    stance: VoteEnumSimple
    content: str


@dataclass(frozen=True)
class GroupDescriptionInput:
    group_key: str
    representative_opinions: list[RepresentativeOpinionText]

    @property
    def agrees_with(self) -> list[str]:
        return [
            opinion.content
            for opinion in self.representative_opinions
            if opinion.stance == VoteEnumSimple.agree
        ]

    @property
    def disagrees_with(self) -> list[str]:
        return [
            opinion.content
            for opinion in self.representative_opinions
            if opinion.stance == VoteEnumSimple.disagree
        ]


@dataclass(frozen=True)
class ConversationDescriptionInput:
    conversation_title: str
    conversation_body: str | None
    groups: list[GroupDescriptionInput]
    analysis_snapshot_id: int | None = None


def build_group_description_input(
    *,
    group: ComputedOpinionGroup,
    opinion_id_by_local_index: dict[int, int],
    opinion_content_by_id: dict[int, str],
) -> GroupDescriptionInput:
    representative_opinions: list[RepresentativeOpinionText] = []
    for representative in group.representative_opinions:
        opinion_id = opinion_id_by_local_index.get(representative.local_opinion_index)
        if opinion_id is None:
            msg = (
                "missing opinion id for representative local index "
                f"{representative.local_opinion_index}"
            )
            raise DescriptionInputError(msg)
        content = opinion_content_by_id.get(opinion_id)
        if content is None:
            msg = f"missing opinion content for representative opinion {opinion_id}"
            raise DescriptionInputError(msg)
        representative_opinions.append(
            RepresentativeOpinionText(
                opinion_id=opinion_id,
                stance=representative.agreement_type,
                content=content,
            )
        )

    if not representative_opinions:
        msg = f"group {group.key} has no representative opinions for description input"
        raise DescriptionInputError(msg)

    return GroupDescriptionInput(
        group_key=group.key,
        representative_opinions=sorted(
            representative_opinions,
            key=lambda opinion: (opinion.stance.value, opinion.opinion_id),
        ),
    )
