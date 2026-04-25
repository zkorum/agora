from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

import numpy as np
import pandas as pd
from solidago import Judgments
from solidago.preference_learning import PreferenceLearning
from solidago.scoring_model import DirectScoringModel, ScoringModel

if TYPE_CHECKING:
    from collections.abc import Sequence


@dataclass(frozen=True)
class SequentialMaxDiffTask:
    best_entity: int
    worst_entity: int
    candidate_set: tuple[int, ...]


@dataclass(frozen=True)
class SequentialMaxDiffFit:
    scores: np.ndarray
    uncertainty_left: np.ndarray
    uncertainty_right: np.ndarray


def sequential_maxdiff_loss(
    *,
    scores: np.ndarray,
    tasks: Sequence[SequentialMaxDiffTask],
    prior_std_dev: float,
) -> float:
    regularization = float(np.dot(scores, scores) / (2.0 * prior_std_dev**2))
    if not tasks:
        return regularization

    loss = regularization
    for task in tasks:
        candidate_coords = np.asarray(task.candidate_set, dtype=np.int64)
        best_stage_scores = scores[candidate_coords]
        loss += _logsumexp(best_stage_scores) - scores[task.best_entity]

        remaining_coords = np.asarray(
            [coord for coord in task.candidate_set if coord != task.best_entity],
            dtype=np.int64,
        )
        worst_stage_scores = -scores[remaining_coords]
        loss += _logsumexp(worst_stage_scores) + scores[task.worst_entity]

    return float(loss)


def sequential_maxdiff_gradient(
    *,
    scores: np.ndarray,
    tasks: Sequence[SequentialMaxDiffTask],
    prior_std_dev: float,
) -> np.ndarray:
    gradient = scores / (prior_std_dev**2)
    for task in tasks:
        candidate_coords = np.asarray(task.candidate_set, dtype=np.int64)
        best_probabilities = _softmax(scores[candidate_coords])
        gradient[candidate_coords] += best_probabilities
        gradient[task.best_entity] -= 1.0

        remaining_coords = np.asarray(
            [coord for coord in task.candidate_set if coord != task.best_entity],
            dtype=np.int64,
        )
        worst_probabilities = _softmax(-scores[remaining_coords])
        gradient[remaining_coords] -= worst_probabilities
        gradient[task.worst_entity] += 1.0

    return gradient


def sequential_maxdiff_hessian(
    *,
    scores: np.ndarray,
    tasks: Sequence[SequentialMaxDiffTask],
    prior_std_dev: float,
) -> np.ndarray:
    hessian = np.eye(len(scores), dtype=np.float64) / (prior_std_dev**2)
    for task in tasks:
        candidate_coords = np.asarray(task.candidate_set, dtype=np.int64)
        best_probabilities = _softmax(scores[candidate_coords])
        hessian[np.ix_(candidate_coords, candidate_coords)] += _softmax_covariance(
            best_probabilities
        )

        remaining_coords = np.asarray(
            [coord for coord in task.candidate_set if coord != task.best_entity],
            dtype=np.int64,
        )
        worst_probabilities = _softmax(-scores[remaining_coords])
        hessian[np.ix_(remaining_coords, remaining_coords)] += _softmax_covariance(
            worst_probabilities
        )

    return hessian


def fit_sequential_maxdiff_map(
    *,
    num_entities: int,
    tasks: Sequence[SequentialMaxDiffTask],
    prior_std_dev: float,
    convergence_error: float,
    high_likelihood_range_threshold: float,
    max_iter: int = 100,
    initialization: np.ndarray | None = None,
) -> SequentialMaxDiffFit:
    if num_entities == 0:
        return SequentialMaxDiffFit(
            scores=np.zeros(0, dtype=np.float64),
            uncertainty_left=np.zeros(0, dtype=np.float64),
            uncertainty_right=np.zeros(0, dtype=np.float64),
        )

    if initialization is None:
        scores = np.zeros(num_entities, dtype=np.float64)
    else:
        scores = np.array(initialization, dtype=np.float64, copy=True)
        if len(scores) != num_entities:
            msg = "Initialization size must match num_entities"
            raise ValueError(msg)

    scores -= scores.mean()

    for _ in range(max_iter):
        gradient = sequential_maxdiff_gradient(
            scores=scores,
            tasks=tasks,
            prior_std_dev=prior_std_dev,
        )
        if float(np.max(np.abs(gradient))) <= convergence_error:
            break

        hessian = sequential_maxdiff_hessian(
            scores=scores,
            tasks=tasks,
            prior_std_dev=prior_std_dev,
        )
        try:
            step = np.linalg.solve(hessian, gradient)
        except np.linalg.LinAlgError:
            stabilized_hessian = hessian + np.eye(num_entities, dtype=np.float64) * 1e-6
            step = np.linalg.solve(stabilized_hessian, gradient)

        direction = -step
        current_loss = sequential_maxdiff_loss(
            scores=scores,
            tasks=tasks,
            prior_std_dev=prior_std_dev,
        )
        directional_derivative = float(np.dot(gradient, direction))
        if directional_derivative >= 0.0:
            msg = "Sequential MaxDiff produced a non-descent Newton direction"
            raise RuntimeError(msg)

        step_size = 1.0
        next_scores = scores + step_size * direction
        next_scores -= next_scores.mean()
        next_loss = sequential_maxdiff_loss(
            scores=next_scores,
            tasks=tasks,
            prior_std_dev=prior_std_dev,
        )

        while (
            next_loss > current_loss + 1e-4 * step_size * directional_derivative
            and step_size > 1e-8
        ):
            step_size *= 0.5
            next_scores = scores + step_size * direction
            next_scores -= next_scores.mean()
            next_loss = sequential_maxdiff_loss(
                scores=next_scores,
                tasks=tasks,
                prior_std_dev=prior_std_dev,
            )

        if next_loss > current_loss:
            msg = "Sequential MaxDiff line search failed to find an improving step"
            raise RuntimeError(msg)

        scores = next_scores
        if float(np.max(np.abs(step_size * direction))) <= convergence_error:
            break
    else:
        msg = f"Sequential MaxDiff failed to converge in {max_iter} iterations"
        raise RuntimeError(msg)

    posterior_hessian = sequential_maxdiff_hessian(
        scores=scores,
        tasks=tasks,
        prior_std_dev=prior_std_dev,
    )
    covariance = np.linalg.pinv(posterior_hessian)
    variances = np.clip(np.diag(covariance), a_min=0.0, a_max=None)
    uncertainty_radius = np.sqrt(2.0 * high_likelihood_range_threshold * variances)

    return SequentialMaxDiffFit(
        scores=scores,
        uncertainty_left=uncertainty_radius,
        uncertainty_right=uncertainty_radius,
    )


class SequentialMaxDiffJudgments(Judgments):
    def __init__(self, *, maxdiff_tasks: pd.DataFrame) -> None:
        tasks_by_user: dict[int, list[dict[str, Any]]] = {}
        for record in maxdiff_tasks.to_dict("records"):
            user_id = int(record["user_id"])
            tasks_by_user.setdefault(user_id, []).append(record)
        self._tasks_by_user = {
            user_id: pd.DataFrame(records) for user_id, records in tasks_by_user.items()
        }

    def __getitem__(self, user: int) -> dict[str, pd.DataFrame] | None:
        user_tasks = self._tasks_by_user.get(user)
        if user_tasks is None:
            return None
        return {"maxdiff_tasks": user_tasks}


class SequentialMaxDiffLearning(PreferenceLearning):
    def __init__(
        self,
        *,
        prior_std_dev: float = 7.0,
        convergence_error: float = 1e-5,
        high_likelihood_range_threshold: float = 1.0,
        max_iter: int = 100,
    ) -> None:
        self.prior_std_dev = prior_std_dev
        self.convergence_error = convergence_error
        self.high_likelihood_range_threshold = high_likelihood_range_threshold
        self.max_iter = max_iter

    def user_learn(
        self,
        user_judgments: dict[str, pd.DataFrame],
        entities: pd.DataFrame,
        initialization: ScoringModel | None = None,
        new_judgments: dict[str, pd.DataFrame] | None = None,
    ) -> ScoringModel:
        del entities, new_judgments

        tasks_frame = user_judgments["maxdiff_tasks"]
        task_records = tasks_frame.to_dict("records")
        if not task_records:
            return DirectScoringModel()

        ordered_entity_ids: list[int] = []
        seen_entity_ids: set[int] = set()
        task_rows: list[tuple[int, int, tuple[int, ...]]] = []
        for record in task_records:
            best_entity = int(record["best_entity"])
            worst_entity = int(record["worst_entity"])
            candidate_set = tuple(int(entity_id) for entity_id in record["candidate_set"])
            task_rows.append((best_entity, worst_entity, candidate_set))
            for entity_id in candidate_set:
                if entity_id in seen_entity_ids:
                    continue
                seen_entity_ids.add(entity_id)
                ordered_entity_ids.append(entity_id)

        entity_to_coordinate = {
            entity_id: coordinate for coordinate, entity_id in enumerate(ordered_entity_ids)
        }
        tasks = [
            SequentialMaxDiffTask(
                best_entity=entity_to_coordinate[best_entity],
                worst_entity=entity_to_coordinate[worst_entity],
                candidate_set=tuple(entity_to_coordinate[entity_id] for entity_id in candidate_set),
            )
            for best_entity, worst_entity, candidate_set in task_rows
        ]

        init_scores: np.ndarray | None = None
        if initialization is not None:
            init_scores = np.zeros(len(ordered_entity_ids), dtype=np.float64)
            for entity_id, (score, _left_unc, _right_unc) in initialization.iter_entities():
                coordinate = entity_to_coordinate.get(entity_id)
                if coordinate is not None:
                    init_scores[coordinate] = score

        fit = fit_sequential_maxdiff_map(
            num_entities=len(ordered_entity_ids),
            tasks=tasks,
            initialization=init_scores,
            prior_std_dev=self.prior_std_dev,
            convergence_error=self.convergence_error,
            high_likelihood_range_threshold=self.high_likelihood_range_threshold,
            max_iter=self.max_iter,
        )

        model = DirectScoringModel()
        for coordinate, entity_id in enumerate(ordered_entity_ids):
            model[entity_id] = (
                float(fit.scores[coordinate]),
                float(fit.uncertainty_left[coordinate]),
                float(fit.uncertainty_right[coordinate]),
            )
        return model

    def to_json(self) -> tuple[str, dict[str, float | int]]:
        return (
            type(self).__name__,
            {
                "prior_std_dev": self.prior_std_dev,
                "convergence_error": self.convergence_error,
                "high_likelihood_range_threshold": self.high_likelihood_range_threshold,
                "max_iter": self.max_iter,
            },
        )

    def __str__(self) -> str:
        return (
            "SequentialMaxDiffLearning("
            f"prior_std_dev={self.prior_std_dev}, "
            f"convergence_error={self.convergence_error}, "
            f"high_likelihood_range_threshold={self.high_likelihood_range_threshold}, "
            f"max_iter={self.max_iter})"
        )


def _logsumexp(values: np.ndarray) -> float:
    max_value = float(np.max(values))
    return max_value + float(np.log(np.exp(values - max_value).sum()))


def _softmax(values: np.ndarray) -> np.ndarray:
    max_value = np.max(values)
    exp_values = np.exp(values - max_value)
    return exp_values / exp_values.sum()


def _softmax_covariance(probabilities: np.ndarray) -> np.ndarray:
    return np.diag(probabilities) - np.outer(probabilities, probabilities)
