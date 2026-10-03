"""Creates/updates one MLflow GenAI Dataset per prepare_data.py tier, so the
real conversation rows (title/body/sibling context) are browsable and
selectable as a unit in the MLflow UI's Datasets tab — Datasets and Traces
are two different mechanisms (see README.md "Lessons learned"), and only
Datasets support "merge these rows into an eval set" as a first-class
object.

Dataset names match the tier's processed filename exactly (e.g. `dummy5`,
`small36`, `medium103`), so the MLflow UI name and the jsonl file it came
from stay obviously linked.

Safe to re-run: the dataset is looked up by name before creating, and
merge_records() upserts existing rows rather than duplicating them.

Usage:
    export MLFLOW_TRACKING_URI=http://127.0.0.1:5001
    uv run python initiatives/seed-opinions/scripts/setup/create_datasets.py
"""

from __future__ import annotations

import json
from pathlib import Path

import mlflow
from mlflow.genai.datasets import create_dataset, search_datasets

EXPERIMENT_NAME = "seed-opinions-per-item"  # Track A; Track B gets its own experiment later
DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
PROCESSED_DIR = DATA_DIR / "processed"
TIERS = ["dummy", "small", "medium"]
# Multi-statement generation (seed-opinions-description.md §3): own experiment, one row per
# conversation (see prepare_data.py's set_* tiers).
SET_EXPERIMENT_NAME = "seed-opinions-per-set"
SET_TIERS = ["set_dummy", "set_small"]


def find_tier_file(tier: str) -> Path:
    """Tier filenames carry a row-count suffix (see prepare_data.py, e.g.
    dummy5.jsonl) that changes whenever the raw data changes, so match by
    prefix instead of a fixed name.
    """
    matches = sorted(PROCESSED_DIR.glob(f"{tier}[0-9]*.jsonl"))
    if not matches:
        msg = f"no processed file for tier '{tier}' in {PROCESSED_DIR} — run prepare_data.py first"
        raise RuntimeError(msg)
    if len(matches) > 1:
        names = ", ".join(m.name for m in matches)
        msg = (
            f"multiple processed files match tier '{tier}': {names} — "
            "remove the stale one(s) so only the latest prepare_data.py output remains"
        )
        raise RuntimeError(msg)
    return matches[0]


def load_rows(path: Path) -> list[dict[str, object]]:
    with path.open(encoding="utf-8") as f:
        return [json.loads(line) for line in f]


def build_records(rows: list[dict[str, object]]) -> list[dict[str, object]]:
    return [
        {
            "inputs": {
                "conversation_title": row["conversation_title"],
                "conversation_body": row["conversation_body"],
                "sibling_seed_opinions": row["sibling_seed_opinions"],
            },
            "tags": {
                "conversation_id": str(row["conversation_id"]),
                "export_source": row["export_source"],
                "language": row["language"],
                "rank": str(row["rank"]),
            },
        }
        for row in rows
    ]


def build_set_records(rows: list[dict[str, object]]) -> list[dict[str, object]]:
    return [
        {
            "inputs": {
                "conversation_title": row["conversation_title"],
                "conversation_body": row["conversation_body"],
                "sibling_seed_opinions": row["sibling_seed_opinions"],
            },
            "tags": {
                "conversation_id": str(row["conversation_id"]),
                "export_source": row["export_source"],
                "language": row["language"],
                "sibling_context": row["sibling_context"],
            },
        }
        for row in rows
    ]


def get_or_create_dataset(name: str, experiment_id: str) -> mlflow.genai.datasets.EvaluationDataset:
    existing = search_datasets(
        experiment_ids=[experiment_id], filter_string=f"name = '{name}'", max_results=1
    )
    if existing:
        return existing[0]
    return create_dataset(name=name, experiment_id=experiment_id)


def main() -> None:
    experiment = mlflow.set_experiment(EXPERIMENT_NAME)

    for tier in TIERS:
        path = find_tier_file(tier)
        rows = load_rows(path)
        records = build_records(rows)

        dataset_name = path.stem
        dataset = get_or_create_dataset(dataset_name, experiment.experiment_id)
        dataset.merge_records(records)
        print(f"[{tier}] {len(records)} records -> dataset '{dataset_name}' (from {path.name})")

    set_experiment = mlflow.set_experiment(SET_EXPERIMENT_NAME)
    for tier in SET_TIERS:
        path = find_tier_file(tier)
        records = build_set_records(load_rows(path))
        dataset = get_or_create_dataset(path.stem, set_experiment.experiment_id)
        dataset.merge_records(records)
        print(f"[{tier}] {len(records)} records -> dataset '{path.stem}' on '{SET_EXPERIMENT_NAME}'")


if __name__ == "__main__":
    main()
