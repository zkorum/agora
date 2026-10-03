"""Reusable, parameterized generation + judging run:
loads a registered prompt version, generates candidates for a dataset
tier via the AI Gateway, and scores them with judges.

Reads conversations from the MLflow Dataset for the given tier (created by
setup/create_datasets.py), not the local processed jsonl directly — MLflow
is the source of truth for what a tier contains from step 4 onward.

Not hardcoded to one prompt or tier — set env vars to run a different
combination without editing this file.

Usage:
    export MLFLOW_TRACKING_URI=http://127.0.0.1:5001
    uv run python initiatives/seed-opinions/scripts/generate.py
    # Or, to try a different prompt version / tier / candidate count:
    SEED_OPINIONS_PROMPT_VERSION=2 SEED_OPINIONS_SUBSET=medium \\
        uv run python initiatives/seed-opinions/scripts/generate.py
    # Or, to compare a different generation model (judges keep using JUDGE_MODEL
    # from configure_judges.py regardless):
    SEED_OPINIONS_GENERATION_MODEL=mistral-large-latest SEED_OPINIONS_SUBSET=small \\
        uv run python initiatives/seed-opinions/scripts/generate.py

Run name: always ends with a UTC timestamp, so consecutive runs never
collide/overwrite each other in the MLflow UI — no need to manually vary
anything for that. Optionally set SEED_OPINIONS_RUN_LABEL for a more
readable prefix than the default `<prompt-name>_v<version>_<tier>` (e.g.
"few-shot-v2"):
    SEED_OPINIONS_RUN_LABEL=few-shot-v2 SEED_OPINIONS_SUBSET=medium \\
        uv run python initiatives/seed-opinions/scripts/generate.py

Predefined-answers mode: set SEED_OPINIONS_PREDEFINED to the name (without
extension) of a jsonl file in data/processed/ to skip generation entirely
and judge that file's already-written answers instead — each row needs
conversation_title/conversation_body/sibling_seed_opinions/seed_opinion,
same shape prepare_data.py produces. Useful whenever you want the judges
scored against a fixed, known input rather than a fresh model call — e.g.
setup/create_judge_test_data.py's judgetest_<judge>.jsonl fixtures (5
hand-authored candidates per judge, each designed to trip that judge's
"no" verdict, to confirm it catches what it's supposed to before trusting
it on generated output), or any other predefined-answer file you add:
    SEED_OPINIONS_PREDEFINED=judgetest_safety \\
        uv run python initiatives/seed-opinions/scripts/generate.py
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

os.environ.setdefault("MLFLOW_GENAI_EVAL_MAX_WORKERS", "2")
os.environ.setdefault("MLFLOW_GENAI_EVAL_MAX_SCORER_WORKERS", "2")

import mlflow
import requests
from mlflow.genai.datasets import search_datasets
from mlflow.genai.label_schemas import list_label_schemas
from mlflow.genai.review_queues import add_items_to_review_queue, create_review_queue

sys.path.insert(0, str(Path(__file__).resolve().parent / "setup"))
from configure_judges import get_track_a_judges  # noqa: E402

EXPERIMENT_NAME = "seed-opinions-per-item"  # Track A; Track B gets its own experiment later
PROCESSED_DIR = Path(__file__).resolve().parent.parent / "data" / "processed"

# Generation model only — judges have their own separate model, JUDGE_MODEL in
# configure_judges.py, unaffected by this.
GATEWAY_ENDPOINT = os.environ.get("SEED_OPINIONS_GENERATION_MODEL", "mistral-small-latest")
PROMPT_NAME = os.environ.get("SEED_OPINIONS_PROMPT_NAME", "seed-opinions-zero-shot")
PROMPT_VERSION = os.environ.get("SEED_OPINIONS_PROMPT_VERSION")  # None = latest
SUBSET_NAME = os.environ.get("SEED_OPINIONS_SUBSET", "dummy")
TARGET_COUNT = int(os.environ.get("SEED_OPINIONS_TARGET_COUNT", "1"))
RUN_LABEL = os.environ.get("SEED_OPINIONS_RUN_LABEL")  # update every time prompt/judges/config change
PREDEFINED_NAME = os.environ.get("SEED_OPINIONS_PREDEFINED")  # jsonl filename stem — skips generation


def find_tier_dataset(tier: str, experiment_id: str) -> mlflow.genai.datasets.EvaluationDataset:
    """Dataset names carry a row-count suffix (see setup/create_datasets.py,
    e.g. dummy5) that changes whenever the raw data changes, so match by
    prefix instead of a fixed name.
    """
    matches = search_datasets(experiment_ids=[experiment_id], filter_string=f"name LIKE '{tier}%'")
    if not matches:
        msg = (
            f"no dataset for tier '{tier}' on experiment {experiment_id} — "
            "run setup/create_datasets.py first"
        )
        raise RuntimeError(msg)
    if len(matches) > 1:
        names = ", ".join(d.name for d in matches)
        msg = (
            f"multiple datasets match tier '{tier}': {names} — "
            "remove the stale one(s) so only the current tier dataset remains"
        )
        raise RuntimeError(msg)
    return matches[0]


def load_prompt() -> mlflow.entities.model_registry.PromptVersion:
    prompt = mlflow.genai.load_prompt(PROMPT_NAME, version=PROMPT_VERSION)
    print(f"Loaded prompt '{prompt.name}' version {prompt.version}")
    return prompt


def load_conversations(experiment_id: str) -> list[dict[str, object]]:
    dataset = find_tier_dataset(SUBSET_NAME, experiment_id)
    df = dataset.to_df()
    rows: list[dict[str, object]] = []
    for _, record in df.iterrows():
        inputs = record["inputs"]
        tags = record["tags"] or {}
        rows.append(
            {
                "conversation_id": tags.get("conversation_id"),
                "export_source": tags.get("export_source"),
                "language": tags.get("language"),
                "conversation_title": inputs["conversation_title"],
                "conversation_body": inputs["conversation_body"],
                # Real human-authored opinions already on this conversation (ground
                # truth, from prepare_data.py/create_datasets.py) — fed to the prompt
                # so it can avoid duplicating them, and used as sibling context when
                # judging (see build_eval_data).
                "existing_opinions": inputs["sibling_seed_opinions"],
            }
        )
    return rows


# mistral-large-latest's rate limit needs a longer tail than 5 attempts (~30s total) to recover.
GATEWAY_MAX_RETRIES = 8
GATEWAY_MAX_WAIT_SECONDS = 60


def call_gateway(messages: list[dict[str, str]]) -> str:
    tracking_uri = mlflow.get_tracking_uri()
    for attempt in range(GATEWAY_MAX_RETRIES):
        response = requests.post(
            f"{tracking_uri}/gateway/mlflow/v1/chat/completions",
            json={"model": GATEWAY_ENDPOINT, "messages": messages},
            timeout=60,
        )
        if response.status_code == 429 and attempt < GATEWAY_MAX_RETRIES - 1:
            wait_seconds = min(int(response.headers.get("Retry-After", 2 ** (attempt + 1))), GATEWAY_MAX_WAIT_SECONDS)
            print(f"  rate limited by {GATEWAY_ENDPOINT}, retrying in {wait_seconds}s...")
            time.sleep(wait_seconds)
            continue
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    raise RuntimeError(f"exceeded {GATEWAY_MAX_RETRIES} retries against {GATEWAY_ENDPOINT}")


def parse_json_string_array(raw_text: str) -> list[str]:
    trimmed = raw_text.strip()
    fence_match = re.fullmatch(r"```(?:json)?\s*([\s\S]*?)\s*```", trimmed, re.IGNORECASE)
    candidate = fence_match.group(1).strip() if fence_match else trimmed
    try:
        parsed = json.loads(candidate)
    except json.JSONDecodeError:
        array_match = re.search(r"\[[\s\S]*\]", candidate)
        if array_match is None:
            msg = f"could not find a JSON array in model output: {raw_text!r}"
            raise ValueError(msg) from None
        parsed = json.loads(array_match.group(0))
    if not isinstance(parsed, list) or not all(isinstance(item, str) for item in parsed):
        msg = f"expected a JSON array of strings, got: {parsed!r}"
        raise ValueError(msg)
    return parsed


def generate_candidates(
    prompt: mlflow.entities.model_registry.PromptVersion, row: dict[str, object]
) -> list[str]:
    messages = prompt.format(
        target_count=TARGET_COUNT,
        conversation_title=row["conversation_title"],
        conversation_body=row["conversation_body"],
        existing_opinions=row["existing_opinions"],
    )
    raw_text = call_gateway(messages)
    return parse_json_string_array(raw_text)


def build_eval_data(
    rows: list[dict[str, object]], prompt: mlflow.entities.model_registry.PromptVersion
) -> list[dict[str, object]]:
    data: list[dict[str, object]] = []
    for row in rows:
        candidates = generate_candidates(prompt, row)
        print(f"  [{row['conversation_id']}] generated {len(candidates)} candidates")
        for candidate in candidates:
            data.append(
                {
                    "inputs": {
                        "conversation_title": row["conversation_title"],
                        "conversation_body": row["conversation_body"],
                        # Real existing opinions, not just this batch's other candidates —
                        # matches what the prompt itself was told to avoid duplicating.
                        "sibling_seed_opinions": row["existing_opinions"],
                    },
                    "outputs": candidate,
                    "tags": {
                        "conversation_id": str(row["conversation_id"]),
                        "export_source": row["export_source"],
                        "language": row["language"],
                        "prompt_name": prompt.name,
                        "prompt_version": str(prompt.version),
                    },
                }
            )
    return data


def load_predefined_rows(name: str) -> list[dict[str, object]]:
    path = PROCESSED_DIR / f"{name}.jsonl"
    if not path.exists():
        msg = f"no predefined-answers file at {path}"
        raise RuntimeError(msg)
    rows: list[dict[str, object]] = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            rows.append(json.loads(line))
    return rows


def build_eval_data_from_predefined(rows: list[dict[str, object]]) -> list[dict[str, object]]:
    return [
        {
            "inputs": {
                "conversation_title": row["conversation_title"],
                "conversation_body": row["conversation_body"],
                "sibling_seed_opinions": row["sibling_seed_opinions"],
            },
            "outputs": row["seed_opinion"],
            "tags": {"predefined_source": PREDEFINED_NAME},
        }
        for row in rows
    ]


def attach_run_traces_to_review_queue(experiment_id: str, run_id: str, run_name: str) -> None:
    """Only if manual evaluation is actually set up (i.e. at least one label
    schema exists on the experiment — see setup/create_label_schemas.py):
    create a review queue named after this run and attach its freshly
    generated traces for manual review (README.md Step 5, item 4). No-op
    otherwise, so experiments without a human-review step don't get an
    empty queue.

    One queue per run (not a shared "default" queue) so items from
    different runs never mix — run_name already ends with a timestamp
    (see main()), so this can't collide with a previous run's queue.
    """
    schemas = list_label_schemas(experiment_id=experiment_id)
    if not schemas:
        return

    traces = mlflow.search_traces(locations=[experiment_id], run_id=run_id)
    trace_ids = traces["trace_id"].tolist()

    queue = create_review_queue(
        name=run_name,
        queue_type="custom",
        schema_ids=[schema.schema_id for schema in schemas],
        experiment_id=experiment_id,
    )
    add_items_to_review_queue(queue.queue_id, item_ids=trace_ids)
    print(f"Attached {len(trace_ids)} traces to review queue '{queue.name}'")


def main() -> None:
    experiment = mlflow.set_experiment(EXPERIMENT_NAME)

    if PREDEFINED_NAME:
        rows = load_predefined_rows(PREDEFINED_NAME)
        print(f"Judging {len(rows)} predefined answers from '{PREDEFINED_NAME}'...")
        data = build_eval_data_from_predefined(rows)
        run_label = RUN_LABEL or PREDEFINED_NAME
    else:
        prompt = load_prompt()
        rows = load_conversations(experiment.experiment_id)
        print(f"Generating candidates for {len(rows)} conversations ({SUBSET_NAME} tier)...")
        data = build_eval_data(rows, prompt)
        print(f"\n{len(data)} generated candidates to judge")
        run_label = RUN_LABEL or f"{prompt.name}_v{prompt.version}_{SUBSET_NAME}"

    scorers = get_track_a_judges()
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    run_name = f"{run_label}_{timestamp}"
    with mlflow.start_run(run_name=run_name) as run:
        if PREDEFINED_NAME:
            mlflow.log_param("predefined_source", PREDEFINED_NAME)
        else:
            mlflow.log_param("prompt_name", prompt.name)
            mlflow.log_param("prompt_version", prompt.version)
            mlflow.log_param("subset", SUBSET_NAME)
            mlflow.log_param("target_count", TARGET_COUNT)
        mlflow.genai.evaluate(data=data, scorers=scorers)
        attach_run_traces_to_review_queue(experiment.experiment_id, run.info.run_id, run_name)


if __name__ == "__main__":
    main()
