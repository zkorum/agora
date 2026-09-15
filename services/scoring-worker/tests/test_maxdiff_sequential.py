from __future__ import annotations

import numpy as np

from scoring_worker.maxdiff_sequential import (
    SequentialMaxDiffTask,
    fit_sequential_maxdiff_map,
    sequential_maxdiff_gradient,
    sequential_maxdiff_hessian,
    sequential_maxdiff_loss,
)


def _task(*, best: int, worst: int, candidate_set: tuple[int, ...]) -> SequentialMaxDiffTask:
    return SequentialMaxDiffTask(
        best_entity=best,
        worst_entity=worst,
        candidate_set=candidate_set,
    )


def test_single_task_ranks_best_above_middle_above_worst() -> None:
    fit = fit_sequential_maxdiff_map(
        num_entities=3,
        tasks=[_task(best=0, worst=2, candidate_set=(0, 1, 2))],
        prior_std_dev=7.0,
        convergence_error=1e-6,
        high_likelihood_range_threshold=1.0,
    )

    assert fit.scores[0] > fit.scores[1] > fit.scores[2]


def test_candidate_order_does_not_change_fit() -> None:
    fit_a = fit_sequential_maxdiff_map(
        num_entities=4,
        tasks=[_task(best=0, worst=3, candidate_set=(0, 1, 2, 3))],
        prior_std_dev=7.0,
        convergence_error=1e-6,
        high_likelihood_range_threshold=1.0,
    )
    fit_b = fit_sequential_maxdiff_map(
        num_entities=4,
        tasks=[_task(best=0, worst=3, candidate_set=(2, 3, 0, 1))],
        prior_std_dev=7.0,
        convergence_error=1e-6,
        high_likelihood_range_threshold=1.0,
    )

    np.testing.assert_allclose(fit_a.scores, fit_b.scores, atol=1e-6)


def test_task_order_does_not_change_fit() -> None:
    tasks = [
        _task(best=0, worst=3, candidate_set=(0, 1, 2, 3)),
        _task(best=1, worst=2, candidate_set=(0, 1, 2)),
    ]
    fit_a = fit_sequential_maxdiff_map(
        num_entities=4,
        tasks=tasks,
        prior_std_dev=7.0,
        convergence_error=1e-6,
        high_likelihood_range_threshold=1.0,
    )
    fit_b = fit_sequential_maxdiff_map(
        num_entities=4,
        tasks=list(reversed(tasks)),
        prior_std_dev=7.0,
        convergence_error=1e-6,
        high_likelihood_range_threshold=1.0,
    )

    np.testing.assert_allclose(fit_a.scores, fit_b.scores, atol=1e-6)


def test_repeated_consistent_tasks_increase_score_gap() -> None:
    single_fit = fit_sequential_maxdiff_map(
        num_entities=3,
        tasks=[_task(best=0, worst=2, candidate_set=(0, 1, 2))],
        prior_std_dev=7.0,
        convergence_error=1e-6,
        high_likelihood_range_threshold=1.0,
    )
    repeated_fit = fit_sequential_maxdiff_map(
        num_entities=3,
        tasks=[_task(best=0, worst=2, candidate_set=(0, 1, 2))] * 4,
        prior_std_dev=7.0,
        convergence_error=1e-6,
        high_likelihood_range_threshold=1.0,
    )

    single_gap = single_fit.scores[0] - single_fit.scores[2]
    repeated_gap = repeated_fit.scores[0] - repeated_fit.scores[2]
    assert repeated_gap > single_gap


def test_contradictory_tasks_shrink_score_gap() -> None:
    consistent_fit = fit_sequential_maxdiff_map(
        num_entities=3,
        tasks=[_task(best=0, worst=2, candidate_set=(0, 1, 2))] * 4,
        prior_std_dev=7.0,
        convergence_error=1e-6,
        high_likelihood_range_threshold=1.0,
    )
    contradictory_fit = fit_sequential_maxdiff_map(
        num_entities=3,
        tasks=[
            _task(best=0, worst=2, candidate_set=(0, 1, 2)),
            _task(best=2, worst=0, candidate_set=(0, 1, 2)),
            _task(best=0, worst=2, candidate_set=(0, 1, 2)),
            _task(best=2, worst=0, candidate_set=(0, 1, 2)),
        ],
        prior_std_dev=7.0,
        convergence_error=1e-6,
        high_likelihood_range_threshold=1.0,
    )

    consistent_gap = consistent_fit.scores[0] - consistent_fit.scores[2]
    contradictory_gap = contradictory_fit.scores[0] - contradictory_fit.scores[2]
    assert contradictory_gap < consistent_gap


def test_analytic_derivatives_match_finite_differences_for_mixed_tasks() -> None:
    scores = np.array([0.3, -0.9, 1.2, 0.8, -0.6])
    tasks = [
        _task(best=0, worst=3, candidate_set=(0, 1, 2, 3)),
        _task(best=2, worst=0, candidate_set=(0, 2, 4)),
        _task(best=4, worst=1, candidate_set=(1, 4)),
        _task(best=3, worst=2, candidate_set=(3, 2, 1)),
        _task(best=1, worst=0, candidate_set=(4, 1, 0)),
    ]
    epsilon = 1e-5
    directions = np.eye(len(scores)) * epsilon
    numerical_gradient = np.array(
        [
            (
                sequential_maxdiff_loss(scores=scores + step, tasks=tasks, prior_std_dev=7.0)
                - sequential_maxdiff_loss(scores=scores - step, tasks=tasks, prior_std_dev=7.0)
            )
            / (2 * epsilon)
            for step in directions
        ]
    )
    numerical_hessian = np.column_stack(
        [
            (
                sequential_maxdiff_gradient(scores=scores + step, tasks=tasks, prior_std_dev=7.0)
                - sequential_maxdiff_gradient(scores=scores - step, tasks=tasks, prior_std_dev=7.0)
            )
            / (2 * epsilon)
            for step in directions
        ]
    )
    gradient = sequential_maxdiff_gradient(scores=scores, tasks=tasks, prior_std_dev=7.0)
    hessian = sequential_maxdiff_hessian(scores=scores, tasks=tasks, prior_std_dev=7.0)
    np.testing.assert_allclose(gradient, numerical_gradient, atol=1e-7)
    np.testing.assert_allclose(hessian, numerical_hessian, atol=1e-7)
    np.testing.assert_allclose(hessian, hessian.T, atol=1e-12)
    assert np.linalg.eigvalsh(hessian).min() >= 1 / 49 - 1e-10
