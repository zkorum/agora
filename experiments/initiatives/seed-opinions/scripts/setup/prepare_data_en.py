"""English counterpart of the French `set_small` tier (prepare_data.py): 26 English
conversations, each emitted with and without its participants' opinions, to check
that the per-set prompt and judges (seed-opinions-description.md §3) hold in another
language. French is only the language the pipeline was tuned on.

The French tier is simply every French conversation in the raw data (26). There are
~370 English ones, so 26 are selected to mirror the French tier's shape, weak
conversations included — those are what the confidence rule and the tips are for:

  source            French tier                              English selection
  agora_db (12)     2 with no description                    2 with no description
                    1 with thin opinions (<3, or junk)       1 with thin opinions
                    9 with a description and 3 opinions      9 likewise
  polis (14)        3 short description + thin opinions      3 likewise
                    2 short description, 3 opinions          2 likewise
                    9 with a description and 3 opinions      9 likewise

Within each group the most recent conversations are taken (by latest opinion), at
most one per author so a campaign's series of near-identical conversations counts
once. Same cleaning, duplicate merging and 3-most-recent-opinions pool as
prepare_data.py.

Writes data/processed/en_set_small<N>.jsonl and registers it as an MLflow dataset
of the same name on the per-set experiment. The name does not start with
`set_small`: generate.find_tier_dataset() matches tiers by prefix.

Usage:
    export MLFLOW_TRACKING_URI=http://127.0.0.1:5001
    uv run python initiatives/seed-opinions/scripts/setup/prepare_data_en.py
    SEED_OPINIONS_SUBSET=en_set_small uv run python initiatives/seed-opinions/scripts/generate_set.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
import py3langid as langid

sys.path.insert(0, str(Path(__file__).resolve().parent))
from create_datasets import SET_EXPERIMENT_NAME, build_set_records, get_or_create_dataset  # noqa: E402
from prepare_data import (  # noqa: E402
    OPINIONS_PER_TOPIC,
    PROCESSED_DIR,
    build_set_rows,
    clean,
    detect_language,
    load_raw,
    merge_empty_body_duplicates,
    write_jsonl,
)

import mlflow  # noqa: E402

LANGUAGE = "en"
TIER = "en_set_small"
SHORT_BODY_CHARS = 120  # the French tier's short descriptions are all under this
JUNK_OPINION_CHARS = 15  # very short entries with no claim
# (source, group) -> how many conversations, mirroring the French tier (see docstring).
QUOTAS = {
    ("agora_db", "no_description"): 2,
    ("agora_db", "thin_opinions"): 1,
    ("agora_db", "good"): 9,
    ("polis_public_api", "short_description_thin_opinions"): 3,
    ("polis_public_api", "short_description"): 2,
    ("polis_public_api", "good"): 9,
}


def english_conversations(df: pd.DataFrame) -> list[dict[str, object]]:
    """Same grouping and opinion pool as prepare_data.french_conversations_sorted_by_recency,
    for English, keeping what the selection needs (author, recency).
    """
    conversations: list[dict[str, object]] = []
    group_keys = ["export_source", "conversation_title", "conversation_body"]
    groups = merge_empty_body_duplicates(dict(iter(df.groupby(group_keys, dropna=False))))
    for (export_source, title, body), group in groups.items():
        if detect_language(title, body) != LANGUAGE:
            continue
        deduped = group.sort_values("seed_opinion_created_at", ascending=False).drop_duplicates(
            subset=["seed_opinion_text"], keep="first"
        )
        latest = deduped.head(OPINIONS_PER_TOPIC)
        conversations.append(
            {
                "export_source": export_source,
                "conversation_id": deduped.iloc[0]["conversation_id"],
                "conversation_title": title,
                "conversation_body": body,
                "language": LANGUAGE,
                "author": deduped.iloc[0]["originating_username"],
                "latest_opinion_at": deduped.iloc[0]["seed_opinion_created_at"],
                "opinions": [
                    {"text": r["seed_opinion_text"], "created_at": r["seed_opinion_created_at"]}
                    for _, r in latest.iterrows()
                ],
            }
        )
    return conversations


def classify(conv: dict[str, object]) -> str | None:
    """Which French-tier group this conversation resembles, or None if it fits none."""
    body = conv["conversation_body"]
    texts = [o["text"] for o in conv["opinions"]]
    thin_opinions = len(texts) < OPINIONS_PER_TOPIC or any(
        len(text.strip()) < JUNK_OPINION_CHARS for text in texts
    )
    if not thin_opinions and langid.classify(" ".join(texts))[0] != LANGUAGE:
        # Short titles get misclassified: real opinions must be English too.
        return None
    if conv["export_source"] == "agora_db":
        if body == "":
            return None if thin_opinions else "no_description"
        return "thin_opinions" if thin_opinions else "good"
    if body == "":
        return None
    if len(body) < SHORT_BODY_CHARS:
        return "short_description_thin_opinions" if thin_opinions else "short_description"
    return None if thin_opinions else "good"


def select(conversations: list[dict[str, object]]) -> list[dict[str, object]]:
    by_recency = sorted(conversations, key=lambda c: c["latest_opinion_at"], reverse=True)
    selected: list[dict[str, object]] = []
    authors: set[str] = set()
    for (source, group), quota in QUOTAS.items():
        candidates = [
            c for c in by_recency if c["export_source"] == source and classify(c) == group
        ]
        picked: list[dict[str, object]] = []
        # One conversation per author; a second pass lifts that if a group runs short.
        for one_per_author in (True, False):
            for conv in candidates:
                if len(picked) == quota:
                    break
                if conv in picked or (one_per_author and conv["author"] in authors):
                    continue
                picked.append({**conv, "group": group})
                authors.add(conv["author"])
        if len(picked) < quota:
            print(f"  only {len(picked)} of {quota} available for {source} / {group}")
        selected.extend(picked)
    return selected


def main() -> None:
    conversations = english_conversations(clean(load_raw()))
    print(f"Found {len(conversations)} English-language conversations")
    selected = select(conversations)
    for conv in selected:
        print(
            f"  [{conv['export_source'][:5]} / {conv['group']}] "
            f"{len(conv['opinions'])} opinions, description {len(conv['conversation_body'])} chars: "
            f"{conv['conversation_title'][:80]}"
        )

    rows = build_set_rows(selected)
    for stale in PROCESSED_DIR.glob(f"{TIER}[0-9]*.jsonl"):
        stale.unlink()
    output = PROCESSED_DIR / f"{TIER}{len(rows)}.jsonl"
    write_jsonl(rows, output)
    print(f"\n[{TIER}] wrote {len(rows)} rows ({len(selected)} conversations) -> {output}")

    experiment = mlflow.set_experiment(SET_EXPERIMENT_NAME)
    dataset = get_or_create_dataset(output.stem, experiment.experiment_id)
    dataset.merge_records(build_set_records(rows))
    print(f"[{TIER}] {len(rows)} records -> dataset '{output.stem}' on '{SET_EXPERIMENT_NAME}'")


if __name__ == "__main__":
    main()
