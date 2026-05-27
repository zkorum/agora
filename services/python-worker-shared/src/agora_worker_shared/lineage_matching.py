from __future__ import annotations

from dataclasses import dataclass

RepresentativeOpinionKey = tuple[int, str]


@dataclass(frozen=True)
class NewLineageGroup:
    key: str
    representative_opinions: frozenset[RepresentativeOpinionKey]


@dataclass(frozen=True)
class PreviousLineageGroup:
    lineage_id: int
    representative_opinions: frozenset[RepresentativeOpinionKey]
    candidate_id: int | None = None


def match_lineages_by_representative_opinions(
    *,
    new_groups: list[NewLineageGroup],
    previous_groups: list[PreviousLineageGroup],
) -> dict[str, int]:
    potential_matches: dict[str, int] = {}
    for new_group in new_groups:
        matching_lineages = exact_matching_lineage_ids(
            new_group=new_group,
            previous_groups=previous_groups,
        )
        if len(matching_lineages) != 1:
            continue
        potential_matches[new_group.key] = matching_lineages[0]

    matched_lineage_ids: set[int] = set()
    lineage_id_by_new_key: dict[str, int] = {}
    for new_key, lineage_id in sorted(potential_matches.items()):
        if lineage_id in matched_lineage_ids:
            continue
        matched_lineage_ids.add(lineage_id)
        lineage_id_by_new_key[new_key] = lineage_id

    return lineage_id_by_new_key


def exact_matching_lineage_ids(
    *,
    new_group: NewLineageGroup,
    previous_groups: list[PreviousLineageGroup],
) -> list[int]:
    if not new_group.representative_opinions:
        return []
    return [
        previous_group.lineage_id
        for previous_group in previous_groups
        if previous_group.representative_opinions == new_group.representative_opinions
    ]
