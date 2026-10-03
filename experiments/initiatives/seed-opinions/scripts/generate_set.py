"""Multi-statement generation + judging run (seed-opinions-description.md §3):
one call per conversation returns a set of statements plus the model's
self-reported confidence, and the per-set judges (setup/configure_set_judges.py)
score the whole set at once.

Same env vars and conventions as generate.py (gateway call, dataset tiers,
timestamped run names, review queue), on experiment `seed-opinions-per-set`.

Both the prompt and the judges default to their latest version in MLflow, so an
edit made in the MLflow UI is picked up by the next run. SEED_OPINIONS_JUDGES_SOURCE=file
uses the definitions in setup/configure_set_judges.py instead.

Usage:
    export MLFLOW_TRACKING_URI=http://127.0.0.1:5001
    SEED_OPINIONS_GENERATION_MODEL=mistral-large-latest SEED_OPINIONS_SUBSET=set_dummy \\
        uv run python initiatives/seed-opinions/scripts/generate_set.py

Predefined-answers mode (judge fixed sets instead of generating — e.g.
setup/create_judge_test_data.py's judgetest_set_* fixtures); each row needs
conversation_title/conversation_body/sibling_seed_opinions/statements/
confidence/user_feedback:
    SEED_OPINIONS_PREDEFINED=judgetest_set_confidence \\
        uv run python initiatives/seed-opinions/scripts/generate_set.py
"""

from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent / "setup"))
from configure_set_judges import get_set_judges, load_registered_set_judges  # noqa: E402
from generate import (  # noqa: E402
    GATEWAY_ENDPOINT,
    attach_run_traces_to_review_queue,
    call_gateway,
    find_tier_dataset,
    load_predefined_rows,
)

import mlflow  # noqa: E402

EXPERIMENT_NAME = "seed-opinions-per-set"
PROMPT_NAME = os.environ.get("SEED_OPINIONS_PROMPT_NAME", "seed-opinions-per-set")
PROMPT_VERSION = os.environ.get("SEED_OPINIONS_PROMPT_VERSION")  # None = latest
SUBSET_NAME = os.environ.get("SEED_OPINIONS_SUBSET", "set_dummy")
TARGET_COUNT = int(os.environ.get("SEED_OPINIONS_TARGET_COUNT", "3"))
RUN_LABEL = os.environ.get("SEED_OPINIONS_RUN_LABEL")
PREDEFINED_NAME = os.environ.get("SEED_OPINIONS_PREDEFINED")
# "registered" (default): latest version of each judge in MLflow, like the prompt.
# "file": the definitions in setup/configure_set_judges.py, e.g. to try a judge before
# registering it.
JUDGES_SOURCE = os.environ.get("SEED_OPINIONS_JUDGES_SOURCE", "registered")


def parse_set_output(raw_text: str) -> dict[str, object]:
    """Parses {"statements": [...], "confidence": true/false, "user_feedback": ...},
    tolerating markdown fences and text around the JSON object (same approach as
    generate.parse_json_string_array).
    """
    trimmed = raw_text.strip()
    fence_match = re.fullmatch(r"```(?:json)?\s*([\s\S]*?)\s*```", trimmed, re.IGNORECASE)
    candidate = fence_match.group(1).strip() if fence_match else trimmed
    try:
        parsed = json.loads(candidate)
    except json.JSONDecodeError:
        object_match = re.search(r"\{[\s\S]*\}", candidate)
        if object_match is None:
            msg = f"could not find a JSON object in model output: {raw_text!r}"
            raise ValueError(msg) from None
        parsed = json.loads(object_match.group(0))
    if not isinstance(parsed, dict):
        msg = f"expected a JSON object, got: {parsed!r}"
        raise ValueError(msg)
    statements = parsed.get("statements")
    if not isinstance(statements, list) or not all(isinstance(item, str) for item in statements):
        msg = f"expected 'statements' to be a list of strings, got: {statements!r}"
        raise ValueError(msg)
    confidence = parsed.get("confidence")
    if not isinstance(confidence, bool):
        msg = f"expected 'confidence' to be true or false, got: {confidence!r}"
        raise ValueError(msg)
    return {
        "statements": statements,
        "confidence": confidence,
        "user_feedback": str(parsed.get("user_feedback", "")),
    }


def load_conversations(experiment_id: str) -> list[dict[str, object]]:
    df = find_tier_dataset(SUBSET_NAME, experiment_id).to_df()
    return [
        {"inputs": record["inputs"], "tags": record["tags"] or {}}
        for _, record in df.iterrows()
    ]


def build_eval_data(
    rows: list[dict[str, object]], prompt: mlflow.entities.model_registry.PromptVersion
) -> list[dict[str, object]]:
    data: list[dict[str, object]] = []
    for row in rows:
        inputs = row["inputs"]
        tags = row["tags"]
        messages = prompt.format(
            target_count=TARGET_COUNT,
            conversation_title=inputs["conversation_title"],
            conversation_body=inputs["conversation_body"],
            existing_opinions=inputs["sibling_seed_opinions"],
        )
        outputs = parse_set_output(call_gateway(messages))
        print(
            f"  [{tags.get('conversation_id')}, {tags.get('sibling_context')} siblings] "
            f"{len(outputs['statements'])} statements, confidence={outputs['confidence']}"
        )
        data.append(
            {
                "inputs": inputs,
                "outputs": outputs,
                "tags": {
                    **tags,
                    "prompt_name": prompt.name,
                    "prompt_version": str(prompt.version),
                    "statement_count": str(len(outputs["statements"])),
                    "confidence": str(outputs["confidence"]).lower(),
                },
            }
        )
    return data


def build_eval_data_from_predefined(rows: list[dict[str, object]]) -> list[dict[str, object]]:
    return [
        {
            "inputs": {
                "conversation_title": row["conversation_title"],
                "conversation_body": row["conversation_body"],
                "sibling_seed_opinions": row["sibling_seed_opinions"],
            },
            "outputs": {
                "statements": row["statements"],
                "confidence": row["confidence"],
                "user_feedback": row["user_feedback"],
            },
            "tags": {"predefined_source": PREDEFINED_NAME},
        }
        for row in rows
    ]


def main() -> None:
    experiment = mlflow.set_experiment(EXPERIMENT_NAME)
    judges = get_set_judges() if JUDGES_SOURCE == "file" else load_registered_set_judges()
    print(f"Judges ({JUDGES_SOURCE}): {', '.join(judge.name for judge in judges)}")

    if PREDEFINED_NAME:
        rows = load_predefined_rows(PREDEFINED_NAME)
        print(f"Judging {len(rows)} predefined sets from '{PREDEFINED_NAME}'...")
        data = build_eval_data_from_predefined(rows)
        run_label = RUN_LABEL or PREDEFINED_NAME
    else:
        prompt = mlflow.genai.load_prompt(PROMPT_NAME, version=PROMPT_VERSION)
        print(f"Loaded prompt '{prompt.name}' version {prompt.version}")
        rows = load_conversations(experiment.experiment_id)
        print(f"Generating sets for {len(rows)} rows ({SUBSET_NAME} tier, {GATEWAY_ENDPOINT})...")
        data = build_eval_data(rows, prompt)
        run_label = RUN_LABEL or f"{prompt.name}_v{prompt.version}_{SUBSET_NAME}"

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
            mlflow.log_param("generation_model", GATEWAY_ENDPOINT)
        mlflow.log_param("judges_source", JUDGES_SOURCE)
        mlflow.genai.evaluate(data=data, scorers=judges)
        attach_run_traces_to_review_queue(experiment.experiment_id, run.info.run_id, run_name)


if __name__ == "__main__":
    main()
