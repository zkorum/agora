"""Exports a past run's traces to CSV for stakeholder review (README.md
Step 7) — one row per trace, with the generated candidate, every judge's
verdict + rationale, and any human review labels already submitted via the
review queue, side by side.

result.result_df (from an in-process evaluate() call) isn't available for
a run that already finished, so this rebuilds the same shape from
mlflow.search_traces()/get_trace() instead.

Deduping: a scorer retry occasionally logs both a failed/earlier attempt
and the final one under the same assessment name (see generate.py's
history — a real MLflow gotcha, not our bug). This keeps only the latest
by create_time_ms per (name, source_type).

Per-set runs (generate_set.py, experiment `seed-opinions-per-set`): the response
is a whole set, so it is split into `confidence`, `user_feedback` and one
`statement_N` column per statement, plus `sibling_context` (with/without
participants' opinions).

Usage:
    export MLFLOW_TRACKING_URI=http://127.0.0.1:5001
    SEED_OPINIONS_RUN_ID=<run_id> \\
        uv run python initiatives/seed-opinions/scripts/export_run.py
    SEED_OPINIONS_EXPERIMENT=seed-opinions-per-set SEED_OPINIONS_RUN_ID=<run_id> \\
        uv run python initiatives/seed-opinions/scripts/export_run.py
"""

from __future__ import annotations

import os
from pathlib import Path

import mlflow
import pandas as pd

# Track A by default; "seed-opinions-per-set" for multi-statement runs.
EXPERIMENT_NAME = os.environ.get("SEED_OPINIONS_EXPERIMENT", "seed-opinions-per-item")
EXPORTS_DIR = Path(__file__).resolve().parent.parent / "exports"

RUN_ID = os.environ.get("SEED_OPINIONS_RUN_ID")


def build_export_rows(experiment_id: str, run_id: str) -> list[dict[str, object]]:
    traces_df = mlflow.search_traces(locations=[experiment_id], run_id=run_id)
    rows: list[dict[str, object]] = []

    for _, trace_row in traces_df.iterrows():
        trace = mlflow.get_trace(trace_row["trace_id"])
        request = trace_row.get("request") or {}

        # Keep only the latest assessment per (name, source_type) — see module
        # docstring on why duplicates can occur.
        latest: dict[tuple[str, str], object] = {}
        for assessment in trace.search_assessments():
            source_type = assessment.source.source_type if assessment.source else "UNKNOWN"
            key = (assessment.name, source_type)
            if key not in latest or assessment.create_time_ms > latest[key].create_time_ms:
                latest[key] = assessment

        row: dict[str, object] = {
            "trace_id": trace_row["trace_id"],
            "conversation_title": request.get("conversation_title"),
            "conversation_body": request.get("conversation_body"),
            "sibling_seed_opinions": " | ".join(request.get("sibling_seed_opinions") or []),
        }
        response = trace_row.get("response")
        if isinstance(response, dict) and "statements" in response:
            row["sibling_context"] = (trace_row.get("tags") or {}).get("sibling_context")
            row["confidence"] = response.get("confidence")
            row["user_feedback"] = response.get("user_feedback")
            for index, statement in enumerate(response["statements"], start=1):
                row[f"statement_{index}"] = statement
        else:
            row["response"] = response

        judge_names = sorted({name for name, source_type in latest if source_type in ("LLM_JUDGE", "CODE")})
        for name in judge_names:
            judge_assessment = latest.get((name, "LLM_JUDGE")) or latest.get((name, "CODE"))
            human_assessment = latest.get((name, "HUMAN"))
            row[f"{name}_judge"] = judge_assessment.value if judge_assessment else None
            row[f"{name}_judge_rationale"] = judge_assessment.rationale if judge_assessment else None
            row[f"{name}_human"] = human_assessment.value if human_assessment else None

        rows.append(row)

    return rows


def main() -> None:
    if not RUN_ID:
        msg = "SEED_OPINIONS_RUN_ID env var is required"
        raise RuntimeError(msg)

    experiment = mlflow.set_experiment(EXPERIMENT_NAME)
    client = mlflow.MlflowClient()
    run = client.get_run(RUN_ID)

    rows = build_export_rows(experiment.experiment_id, RUN_ID)

    EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
    output = EXPORTS_DIR / f"{run.info.run_name}.csv"
    pd.DataFrame(rows).to_csv(output, index=False)
    print(f"Exported {len(rows)} rows from run '{run.info.run_name}' -> {output}")


if __name__ == "__main__":
    main()
