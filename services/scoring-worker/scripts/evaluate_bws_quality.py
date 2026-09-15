"""Offline, seeded quality measurements for the production BWS scoring pipeline.

Task sets are fixed independently of preferences. This isolates scoring behavior
from adaptive routing and never reads or writes the application database.
"""

from __future__ import annotations

import argparse
import json
import logging
from dataclasses import dataclass
from importlib.metadata import version
from itertools import combinations
from math import isclose, isfinite
from pathlib import Path
from random import Random
from statistics import mean

from pydantic import BaseModel, Field

from scoring_worker.db import ComparisonRow
from scoring_worker.pipeline_config import PIPELINE_CONFIG
from scoring_worker.scoring import score_comparisons


class Configuration(BaseModel):
    items: int = Field(default=40, ge=4)
    participants: int = Field(default=100, ge=2)
    seeds: list[int] = Field(default=[0, 1, 2], min_length=1)
    output: Path | None = None


@dataclass(frozen=True)
class Case:
    name: str
    tasks: int = 20
    noise: float = 0.0
    support_share: float = 1.0
    sparse: bool = False
    has_reference: bool = True


CASES = (
    Case(name="unanimous-1-task", tasks=1),
    Case(name="unanimous-5-tasks", tasks=5),
    Case(name="unanimous-20-tasks"),
    Case(name="unanimous-60-tasks", tasks=60),
    Case(name="reversed-unanimous", support_share=0.0),
    Case(name="noise-10-percent", noise=0.1),
    Case(name="noise-30-percent", noise=0.3),
    Case(name="noise-100-percent", noise=1.0),
    Case(name="majority-80-20", support_share=0.8),
    Case(name="majority-60-40", support_share=0.6),
    Case(name="majority-51-49", support_share=0.51),
    Case(name="polarized-50-50", support_share=0.5, has_reference=False),
    Case(name="sparse-half-dropout", sparse=True),
)


@dataclass(frozen=True)
class Measurement:
    case: str
    seed: int
    comparisons: int
    coverage: float
    reference_is_consensus: bool
    reference_pair_agreement: float | None
    top_five_recovery: float | None
    observed_pairs: int
    unopposed_observed_pairs: int
    reversed_unopposed_observed_pairs: int
    finite_scores_and_uncertainties: bool


def build_votes(*, config: Configuration, case: Case, seed: int) -> list[ComparisonRow]:
    items = [f"i{index:03}" for index in range(config.items)]
    supporters = round(config.participants * case.support_share)
    votes: list[ComparisonRow] = []
    for user in range(config.participants):
        task_rng = Random(f"{seed}:tasks:{user}")
        budget_rng = Random(f"{seed}:budget:{user}")
        budget = case.tasks
        if case.sparse and budget_rng.random() < 0.5:
            budget = budget_rng.randrange(1, case.tasks)
        for index in range(budget):
            candidates = sorted(task_rng.sample(items, 4))
            choice_rng = Random(f"{seed}:choice:{user}:{index}")
            if choice_rng.random() < case.noise:
                best, worst = choice_rng.sample(candidates, 2)
            elif user < supporters:
                best, worst = candidates[0], candidates[-1]
            else:
                best, worst = candidates[-1], candidates[0]
            votes.append(
                ComparisonRow(
                    user_idx=user,
                    best_slug_id=best,
                    worst_slug_id=worst,
                    candidate_set=candidates,
                )
            )
    return votes


def measure(*, config: Configuration, case: Case, seed: int) -> Measurement:
    items = [f"i{index:03}" for index in range(config.items)]
    reference = items[::-1] if case.support_share == 0 else items
    votes = build_votes(config=config, case=case, seed=seed)
    output = score_comparisons(entity_ids=items, comparisons=votes)
    if output is None:
        raise RuntimeError(f"No scoring output for nonempty fixture {case.name}")
    scores = {row.entity_id: row.score for row in output.global_scores}
    scored_reference = [item for item in reference if item in scores]
    pairs = list(combinations(scored_reference, 2))
    agreement = (
        mean(
            0.5 if isclose(scores[a], scores[b], abs_tol=1e-9) else float(scores[a] > scores[b])
            for a, b in pairs
        )
        if pairs
        else None
    )
    ranked = sorted(scores, key=lambda item: scores[item], reverse=True)
    k = min(5, len(items))
    tied_boundary = len(ranked) > k and isclose(
        scores[ranked[k - 1]], scores[ranked[k]], abs_tol=1e-9
    )
    recovery = len(set(ranked[:k]) & set(reference[:k])) / k if not tied_boundary else None

    # Count expressed preferences, not comparisons inferred by per-user models.
    # A pair observed by only a few users is not unanimity of the whole population.
    directions: dict[tuple[str, str], set[tuple[str, str]]] = {}
    for vote in votes:
        expressed = {
            pair
            for item in vote.candidate_set
            for pair in ((vote.best_slug_id, item), (item, vote.worst_slug_id))
            if pair[0] != pair[1]
        }
        for a, b in expressed:
            key = (a, b) if a < b else (b, a)
            directions.setdefault(key, set()).add((a, b))
    unopposed = [next(iter(values)) for values in directions.values() if len(values) == 1]
    return Measurement(
        case=case.name,
        seed=seed,
        comparisons=len(votes),
        coverage=len(scores) / len(items),
        reference_is_consensus=case.has_reference and case.noise < 1,
        reference_pair_agreement=agreement if case.has_reference else None,
        top_five_recovery=recovery if case.has_reference else None,
        observed_pairs=len(directions),
        unopposed_observed_pairs=len(unopposed),
        reversed_unopposed_observed_pairs=sum(scores[a] < scores[b] for a, b in unopposed),
        finite_scores_and_uncertainties=all(
            isfinite(row.score)
            and isfinite(row.uncertainty_left)
            and row.uncertainty_left >= 0
            and isfinite(row.uncertainty_right)
            and row.uncertainty_right >= 0
            for row in output.global_scores
        ),
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--items", type=int, default=40)
    parser.add_argument("--participants", type=int, default=100)
    parser.add_argument("--seeds", type=int, nargs="+", default=[0, 1, 2])
    parser.add_argument("--output", type=Path)
    config = Configuration.model_validate(vars(parser.parse_args()))
    if config.participants % 2:
        parser.error("Use an even participant count for the balanced polarization fixture")
    logging.basicConfig(level=logging.WARNING)
    from dataclasses import asdict

    measurements = [
        measure(config=config, case=case, seed=seed) for case in CASES for seed in config.seeds
    ]
    summary: list[dict[str, str | float | bool | None]] = []
    for case in CASES:
        selected = [result for result in measurements if result.case == case.name]
        agreements = [
            result.reference_pair_agreement
            for result in selected
            if result.reference_pair_agreement is not None
        ]
        recoveries = [
            result.top_five_recovery for result in selected if result.top_five_recovery is not None
        ]
        summary.append(
            {
                "case": case.name,
                "mean_comparisons": mean(result.comparisons for result in selected),
                "pair_agreement_mean": mean(agreements) if agreements else None,
                "pair_agreement_min": min(agreements) if agreements else None,
                "pair_agreement_max": max(agreements) if agreements else None,
                "top_five_recovery_mean": mean(recoveries) if recoveries else None,
                "reversed_unopposed_pairs_mean": mean(
                    result.reversed_unopposed_observed_pairs for result in selected
                ),
                "all_finite": all(result.finite_scores_and_uncertainties for result in selected),
                "minimum_coverage": min(result.coverage for result in selected),
            }
        )
    report = {
        "config": config.model_dump(mode="json"),
        "solidago_version": version("solidago"),
        "pipeline": PIPELINE_CONFIG,
        "notes": [
            "Offline fixed random task sets: adaptive API routing is not exercised.",
            "Polarized populations have no single consensus reference; "
            "recovery metrics are omitted.",
            "100% random choices contain no preference signal; "
            "reference agreement measures chance recovery.",
            "Unopposed observed pairs do not establish unanimity among all participants.",
        ],
        "summary": summary,
        "measurements": [asdict(result) for result in measurements],
    }
    if config.output is not None:
        config.output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
