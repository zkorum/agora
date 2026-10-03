"""Creates the label schemas human reviewers use to manually annotate
generated candidates, one per custom judge that needs manual annotation
(single_point, contestable, fresh, fitting, safety — see configure_judges.py). The
2 remaining built-in judges (Fluency, ResponseLength) don't get a schema:
they're not being manually validated.

Each schema shares its `name` with the matching judge and uses the same
yes/no scale (InputCategorical, not InputPassFail's True/False) so a
judge's assessment and a human's label are directly comparable and
compatible with mlflow.genai.judges.AlignmentOptimizer.align() later (see
README.md "Manual/human evaluation").

Schemas are tracking-store objects scoped to EXPERIMENT_NAME (same store
as runs/datasets/prompts — mlflow.db here), not files in this repo.

Safe to re-run: missing schemas are created, and existing ones get their
instruction updated in place if it changed (so reviewers always see the
current wording) — never deleted/recreated, so labels already submitted
stay attached.

Usage:
    export MLFLOW_TRACKING_URI=http://127.0.0.1:5001
    uv run python initiatives/seed-opinions/scripts/setup/create_label_schemas.py
"""

from __future__ import annotations

import mlflow
from mlflow.genai.label_schemas import (
    InputCategorical,
    LabelSchema,
    create_label_schema,
    list_label_schemas,
    update_label_schema,
)

EXPERIMENT_NAME = "seed-opinions-per-item"  # Track A; Track B gets its own experiment later
YES_NO_OPTIONS = ["yes", "no"]

SCHEMAS = [
    {
        "name": "single_point",
        "instruction": (
            "Is this a single, specific, votable point? Answer 'no' if it combines "
            "multiple ideas, is too vague/complex to cleanly agree or disagree with, "
            "or bundles several proposals together. One reason or goal ('X, to "
            "achieve Y') is fine if it is itself a single idea."
        ),
    },
    {
        "name": "contestable",
        "instruction": (
            "Does this express a position that could reasonably be agreed or "
            "disagreed with? Answer 'no' if it's a neutral fact, a question, or "
            "something virtually everyone would agree with regardless of viewpoint."
        ),
    },
    {
        "name": "fresh",
        "instruction": (
            "Does this provide a sufficiently new perspective compared to the other "
            "candidate statements shown alongside it for the same conversation? "
            "Answer 'no' if it substantially repeats one of them, just reworded."
        ),
    },
    {
        "name": "fitting",
        "instruction": (
            "Does this fit in with the participants' own statements shown alongside it: "
            "a similar level of simplicity/complexity, in words they would understand? "
            "Answer 'no' only for a clear mismatch: clearly more complex or simpler than "
            "them, or jargon, invented terms, or unexplained acronyms. A different tone, "
            "or a widely known term from public debate, is fine."
        ),
    },
    {
        "name": "safety",
        "instruction": (
            "Is this safe to publish? Answer 'no' if it contains a personal attack, "
            "insult, or harassment; hate speech or discrimination; misinformation or "
            "conspiracy theories presented as fact; spam or unsolicited promotion; or "
            "private/personally-identifiable information about a real individual."
        ),
    },
]


# Multi-statement generation (§3, configure_set_judges.py): same names as its judges,
# asked about the whole set — "no" if any statement fails.
SET_EXPERIMENT_NAME = "seed-opinions-per-set"
SET_SCHEMAS = [
    {
        "name": "single_point",
        "instruction": (
            "Does EVERY statement make one proposal? Answer 'no' only if a statement packs "
            "two proposals into one, each of which could be voted on separately. A goal, "
            "reason, condition or precision attached to a single proposal is fine."
        ),
    },
    {
        "name": "contestable",
        "instruction": (
            "Could participants agree or disagree with EVERY statement, in the way this "
            "conversation asks them to vote? Answer 'no' if any is a neutral fact, a "
            "question, a truism, or a comment about an argument when the conversation "
            "asks for views on the topic itself."
        ),
    },
    {
        "name": "fresh",
        "instruction": (
            "Is EVERY statement new compared with the participants' opinions? Answer 'no' "
            "if any makes the same claim as one of them, just reworded. Same topic with a "
            "different claim, or the opposite side, is not a repeat."
        ),
    },
    {
        "name": "fitting",
        "instruction": (
            "Is EVERY statement written at a level similar to the participants' opinions, "
            "in words they'd understand? Answer 'no' only for a clear mismatch in "
            "wording, or jargon/invented terms/unexplained acronyms. New ideas, opposing "
            "views and nuance in everyday words are fine; ignore nonsense opinions."
        ),
    },
    {
        "name": "safety",
        "instruction": (
            "Is EVERY statement safe to publish? Answer 'no' if any contains an attack, "
            "hate speech, misinformation, spam, private information, or advocacy of "
            "violent or disruptive action."
        ),
    },
    {
        "name": "coverage",
        "instruction": (
            "Do the statements, together, cover a wide spectrum of ideas? On a "
            "for-or-against question: different positions (for, against, nuanced); answer "
            "'no' if they all lean the same way. On a call for proposals or ideas: "
            "clearly different proposals, no opposing position needed. In both cases "
            "answer 'no' if they stick to one aspect or are variations on one view."
        ),
    },
    {
        "name": "confidence",
        "instruction": (
            "Is the stated confidence justified? true if the topic is clear enough for "
            "relevant proposals, from the title/description OR from existing opinions; "
            "false only if neither makes it clear. Answer 'no' if it's miscalibrated."
        ),
    },
    {
        "name": "user_feedback",
        "instruction": (
            "Is user_feedback useful to the conversation's author? It must give concrete "
            "tips to improve the title/description, in 300 characters at most. Answer "
            "'no' if it says what is bad instead of suggesting, is generic, asks for "
            "something else, suggests what the description already says, misses the "
            "author's question, is too long, is empty, or is not "
            "in the conversation's language."
        ),
    },
]


def sync_label_schemas(experiment_id: str, specs: list[dict[str, str]]) -> list[LabelSchema]:
    existing = {schema.name: schema for schema in list_label_schemas(experiment_id=experiment_id)}
    schemas: list[LabelSchema] = []
    for spec in specs:
        current = existing.get(spec["name"])
        if current is not None:
            if current.instruction == spec["instruction"]:
                print(f"  '{spec['name']}' unchanged, skipping")
                continue
            schemas.append(update_label_schema(current.schema_id, instruction=spec["instruction"]))
            print(f"  '{spec['name']}' instruction updated")
            continue
        schema = create_label_schema(
            name=spec["name"],
            type="feedback",
            input=InputCategorical(options=YES_NO_OPTIONS),
            instruction=spec["instruction"],
            enable_comment=True,
            experiment_id=experiment_id,
        )
        schemas.append(schema)
        print(f"  '{spec['name']}' created")
    return schemas


def main() -> None:
    experiment = mlflow.set_experiment(EXPERIMENT_NAME)
    changed = sync_label_schemas(experiment.experiment_id, SCHEMAS)
    print(f"\n{len(changed)} label schema(s) created or updated on '{EXPERIMENT_NAME}'")
    set_experiment = mlflow.set_experiment(SET_EXPERIMENT_NAME)
    changed = sync_label_schemas(set_experiment.experiment_id, SET_SCHEMAS)
    print(f"\n{len(changed)} label schema(s) created or updated on '{SET_EXPERIMENT_NAME}'")


if __name__ == "__main__":
    main()
