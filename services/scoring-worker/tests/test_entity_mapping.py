"""Contracts at the slug-to-integer scoring boundary."""

import pytest

from scoring_worker.entity_mapping import (
    EntityIdMapper,
    SolidagoEntityScore,
    map_scores_from_solidago,
)


def test_assigns_dense_ids_in_first_occurrence_order() -> None:
    mapper = EntityIdMapper(entity_ids=["z_Last", "a-first", "z_Last", "middle"])

    assert mapper.all_int_ids() == [0, 1, 2]
    assert mapper.to_int("z_Last") == 0
    assert mapper.to_int("a-first") == 1
    assert mapper.to_int("middle") == 2
    assert [mapper.to_str(i) for i in mapper.all_int_ids()] == [
        "z_Last",
        "a-first",
        "middle",
    ]


@pytest.mark.parametrize("int_id", [-1, 2])
def test_rejects_out_of_range_integer_ids(int_id: int) -> None:
    mapper = EntityIdMapper(entity_ids=["first", "last"])

    with pytest.raises(KeyError):
        mapper.to_str(int_id)


def test_rejects_an_unknown_slug() -> None:
    mapper = EntityIdMapper(entity_ids=["known"])

    with pytest.raises(KeyError):
        mapper.to_int("missing")


def test_maps_a_sparse_score_result_without_swapping_uncertainties() -> None:
    result = map_scores_from_solidago(
        solidago_scores=[(2, (-2.0, 0.5, 1.2))],
        mapper=EntityIdMapper(entity_ids=["first", "unscored", "last"]),
    )

    assert result == [
        SolidagoEntityScore(
            entity_id="last", score=-2.0, uncertainty_left=0.5, uncertainty_right=1.2
        )
    ]
