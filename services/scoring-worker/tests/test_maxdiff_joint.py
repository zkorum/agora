from __future__ import annotations

import numpy as np

from scoring_worker.maxdiff_joint import (
    JointMaxDiffTask,
    fit_joint_maxdiff_map,
    joint_maxdiff_gradient,
    joint_maxdiff_hessian,
    joint_maxdiff_loss,
)


def _fit(tasks: list[JointMaxDiffTask], *, num_entities: int):
    return fit_joint_maxdiff_map(
        num_entities=num_entities,
        tasks=tasks,
        prior_std_dev=7.0,
        convergence_error=1e-6,
        high_likelihood_range_threshold=1.0,
    )


def test_single_task_ranks_best_above_middle_above_worst() -> None:
    fit = _fit([JointMaxDiffTask(0, 2, (0, 1, 2))], num_entities=3)
    assert fit.scores[0] > fit.scores[1] > fit.scores[2]


def test_candidate_and_task_order_do_not_change_fit() -> None:
    tasks = [JointMaxDiffTask(0, 3, (0, 1, 2, 3)), JointMaxDiffTask(1, 2, (0, 1, 2))]
    permuted = [JointMaxDiffTask(1, 2, (2, 0, 1)), JointMaxDiffTask(0, 3, (2, 3, 0, 1))]
    np.testing.assert_allclose(
        _fit(tasks, num_entities=4).scores,
        _fit(permuted, num_entities=4).scores,
        atol=1e-6,
    )


def test_reversing_best_and_worst_negates_scores() -> None:
    tasks = [JointMaxDiffTask(0, 3, (0, 1, 2, 3)), JointMaxDiffTask(1, 2, (0, 1, 2))]
    reversed_tasks = [
        JointMaxDiffTask(task.worst_entity, task.best_entity, task.candidate_set) for task in tasks
    ]
    np.testing.assert_allclose(
        _fit(tasks, num_entities=4).scores,
        -_fit(reversed_tasks, num_entities=4).scores,
        atol=1e-6,
    )


def test_repeated_consistent_tasks_increase_score_gap() -> None:
    task = JointMaxDiffTask(0, 2, (0, 1, 2))
    single = _fit([task], num_entities=3)
    repeated = _fit([task] * 4, num_entities=3)
    assert repeated.scores[0] - repeated.scores[2] > single.scores[0] - single.scores[2]


def test_contradictory_tasks_shrink_score_gap() -> None:
    task = JointMaxDiffTask(0, 2, (0, 1, 2))
    consistent = _fit([task] * 4, num_entities=3)
    contradictory = _fit([task, JointMaxDiffTask(2, 0, (0, 1, 2))] * 2, num_entities=3)
    assert contradictory.scores[0] - contradictory.scores[2] < (
        consistent.scores[0] - consistent.scores[2]
    )


def test_joint_loss_normalizes_all_distinct_best_worst_pairs() -> None:
    scores = np.array([0.3, -0.9, 1.2, 0.8])
    logits = np.array(
        [
            0.5 * (scores[best] - scores[worst])
            for best in range(4)
            for worst in range(4)
            if best != worst
        ]
    )
    expected = np.log(np.exp(logits).sum()) - 0.5 * (scores[2] - scores[1])
    expected += np.dot(scores, scores) / 98
    np.testing.assert_allclose(
        joint_maxdiff_loss(
            scores=scores,
            tasks=[JointMaxDiffTask(2, 1, (0, 1, 2, 3))],
            prior_std_dev=7.0,
        ),
        expected,
        atol=1e-12,
    )


def test_pairwise_matches_one_binary_logistic_observation() -> None:
    scores = np.array([0.7, -0.4])
    tasks = [JointMaxDiffTask(0, 1, (0, 1))]
    probability = 1 / (1 + np.exp(scores[0] - scores[1]))
    expected_loss = np.logaddexp(0, scores[1] - scores[0]) + np.dot(scores, scores) / 98
    expected_gradient = scores / 49 + np.array([-probability, probability])
    expected_hessian = np.eye(2) / 49 + probability * (1 - probability) * np.array(
        [[1, -1], [-1, 1]]
    )
    np.testing.assert_allclose(
        joint_maxdiff_loss(scores=scores, tasks=tasks, prior_std_dev=7.0), expected_loss
    )
    np.testing.assert_allclose(
        joint_maxdiff_gradient(scores=scores, tasks=tasks, prior_std_dev=7.0), expected_gradient
    )
    np.testing.assert_allclose(
        joint_maxdiff_hessian(scores=scores, tasks=tasks, prior_std_dev=7.0), expected_hessian
    )


def test_analytic_derivatives_match_finite_differences_for_mixed_tasks() -> None:
    scores = np.array([0.3, -0.9, 1.2, 0.8, -0.6])
    tasks = [
        JointMaxDiffTask(0, 3, (0, 1, 2, 3)),
        JointMaxDiffTask(2, 0, (0, 2, 4)),
        JointMaxDiffTask(4, 1, (1, 4)),
        JointMaxDiffTask(3, 2, (3, 2, 1)),
    ]
    epsilon = 1e-5
    directions = np.eye(len(scores)) * epsilon
    numerical_gradient = np.array(
        [
            (
                joint_maxdiff_loss(scores=scores + step, tasks=tasks, prior_std_dev=7.0)
                - joint_maxdiff_loss(scores=scores - step, tasks=tasks, prior_std_dev=7.0)
            )
            / (2 * epsilon)
            for step in directions
        ]
    )
    numerical_hessian = np.column_stack(
        [
            (
                joint_maxdiff_gradient(scores=scores + step, tasks=tasks, prior_std_dev=7.0)
                - joint_maxdiff_gradient(scores=scores - step, tasks=tasks, prior_std_dev=7.0)
            )
            / (2 * epsilon)
            for step in directions
        ]
    )
    gradient = joint_maxdiff_gradient(scores=scores, tasks=tasks, prior_std_dev=7.0)
    hessian = joint_maxdiff_hessian(scores=scores, tasks=tasks, prior_std_dev=7.0)
    np.testing.assert_allclose(gradient, numerical_gradient, atol=1e-7)
    np.testing.assert_allclose(hessian, numerical_hessian, atol=1e-7)
    np.testing.assert_allclose(hessian, hessian.T, atol=1e-12)
    assert np.linalg.eigvalsh(hessian).min() >= 1 / 49 - 1e-10
