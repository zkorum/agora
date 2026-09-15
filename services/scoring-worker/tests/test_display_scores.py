from math import isclose

from scoring_worker.display_scores import squash_display_scores


def test_fixed_scale_keeps_polarized_scores_close_to_the_centre() -> None:
    raw = {28: 0.17956215, 39: 0.10607594, 9: 0.08546729, 0: -0.13549833}
    before = dict(raw)
    displayed = squash_display_scores(raw)
    assert raw == before
    assert isclose(displayed[28], 0.58837, abs_tol=1e-5)
    assert min(displayed.values()) > 0.4
    assert max(displayed.values()) < 0.6
    assert sorted(displayed, key=lambda key: displayed[key]) == sorted(
        raw, key=lambda key: raw[key]
    )


def test_unrelated_extreme_does_not_rescale_existing_display_scores() -> None:
    original = {1: -0.1, 2: 0.0, 3: 0.1}
    displayed = squash_display_scores(original)
    expanded = squash_display_scores({**original, 4: 100.0})
    assert displayed == {key: expanded[key] for key in original}
    assert displayed[2] == 0.5
    assert squash_display_scores({}) == {}
