"""Step 1 test-subset selection:
every conversation ("topic") gets the same up-to-3-opinion pool (the most
recently created human-authored seed opinions, deduped) — that pool is
what a row's sibling_seed_opinions is drawn from, regardless of tier. Tiers
differ only in how many rows they actually emit from that shared pool:
  - dummy: 1 opinion from each of the first 5 topics — fastest possible
    end-to-end check of the judges/pipeline.
  - small: 1 opinion per topic (all of them) — quick smoke tests.
  - medium: 3 opinions per topic (all of them) — the actual step 1 working set.
  - set_dummy / set_small: multi-statement generation (§3) — one row per
    conversation with the whole pool as siblings, plus the same row with no
    siblings.

Because siblings always come from the full 3-opinion pool rather than just
the opinions a tier happens to emit, dummy/small rows still carry real
sibling context (the other 1-2 pool opinions for that topic) even though
they only emit one row per topic — the pool, not the emitted row count,
is what "constructed the same way as medium" refers to.

Works from the raw CSVs directly (not data/processed/cleaned_conversations.jsonl)
because "N latest" needs seed_opinion_created_at, which the general cleaning
step doesn't keep. This is the only data that gets processed through MLflow
(see configure_judges.py / judge_eval.py) — browsing the full
611-conversation / 14,652-opinion pool as MLflow traces turned out to be
more noise than signal.

Every tier is derived from the same per-conversation, recency-sorted,
deduped opinion pool, so language detection / cleaning only runs once.

Usage:
    uv run python initiatives/seed-opinions/scripts/setup/prepare_data.py
"""

from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

import pandas as pd
import py3langid as langid

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
RAW_FILES = [
    RAW_DIR / "public_seed_opinions_202607140059_no_private.csv",
    RAW_DIR / "polis-directory-seed-opinions.csv",
]
TARGET_LANGUAGE = "fr"
OPINIONS_PER_TOPIC = 3  # pool size every tier draws sibling context from
SUBSET_SIZES = {
    "dummy": {"n": 1, "topics": 5},
    "small": {"n": 1, "topics": None},
    "medium": {"n": OPINIONS_PER_TOPIC, "topics": None},
}
# Multi-statement generation (seed-opinions-description.md §3): one row per conversation,
# emitted twice — with the full opinion pool as siblings, and with none — so the
# confidence judge sees both "enough context" and "no context" for the same topic.
SET_SUBSET_TOPICS = {"set_dummy": 5, "set_small": None}


def load_raw() -> pd.DataFrame:
    frames = [pd.read_csv(path) for path in RAW_FILES]
    return pd.concat(frames, ignore_index=True)


def clean(df: pd.DataFrame) -> pd.DataFrame:
    df = df.dropna(subset=["seed_opinion_text", "conversation_title", "seed_opinion_created_at"])
    df = df.assign(
        conversation_title=df["conversation_title"].str.strip(),
        conversation_body=df["conversation_body"].fillna("").str.strip(),
        seed_opinion_text=df["seed_opinion_text"].str.strip(),
        seed_opinion_created_at=pd.to_datetime(
            df["seed_opinion_created_at"], format="mixed", utc=True
        ),
    )
    df = df[df["conversation_title"] != ""]
    df = df[df["seed_opinion_text"] != ""]
    return df


def detect_language(title: str, body: str) -> str:
    """py3langid is deterministic (unlike langdetect) and needs no model
    download. The raw CSVs carry no language column.
    """
    text = f"{title}\n{body}".strip()
    if not text:
        return "unknown"
    language, _confidence = langid.classify(text)
    return language


def merge_empty_body_duplicates(
    groups: dict[tuple[str, str, str], pd.DataFrame],
) -> dict[tuple[str, str, str], pd.DataFrame]:
    """Some re-submissions of the same conversation carry an empty/NaN body
    while other instances of that same title carry the real body text
    (observed: one conversation_id had a NaN conversation_body while its
    duplicate — same title, same campaign — had the real text). Since
    the primary grouping is (export_source, title, body), those land in
    different groups and the empty-body one slips through as a "distinct"
    conversation instead of being merged as a duplicate.

    Fold each empty-body group into its title's non-empty-body group, but
    only when that's unambiguous (exactly one non-empty body exists for that
    title) — some titles genuinely have multiple, unrelated non-empty bodies
    (one title appears with 2 distinct real bodies in the raw data), and
    guessing which one an empty-body variant belongs to would be wrong.
    """
    by_title: dict[tuple[str, str], list[tuple[str, pd.DataFrame]]] = defaultdict(list)
    for (export_source, title, body), group in groups.items():
        by_title[(export_source, title)].append((body, group))

    merged = dict(groups)
    for (export_source, title), variants in by_title.items():
        empty_variants = [(body, group) for body, group in variants if body == ""]
        non_empty_variants = [(body, group) for body, group in variants if body != ""]
        if not empty_variants or len(non_empty_variants) != 1:
            continue
        target_body, target_group = non_empty_variants[0]
        for empty_body, empty_group in empty_variants:
            del merged[(export_source, title, empty_body)]
            target_group = pd.concat([target_group, empty_group])
        merged[(export_source, title, target_body)] = target_group
    return merged


def french_conversations_sorted_by_recency(df: pd.DataFrame, max_n: int) -> list[dict[str, object]]:
    """One entry per distinct French-language conversation, holding its
    up-to-max_n most recent distinct opinions (most recent first).

    Grouped by (export_source, title, body) rather than conversation_id:
    some conversation_ids are the same conversation re-submitted multiple
    times within minutes by the same author with identical title/body and
    near-identical opinions (observed: 11 conversation_ids with the same
    title created by the same user within a 5-minute window,
    each carrying the same 16 opinion texts) — real test/duplicate data,
    not distinct topics. Merging their opinion pools and deduping by text
    collapses them into one representative conversation instead of
    inflating the topic count 11x. merge_empty_body_duplicates() then folds
    in re-submissions that share the same title but have an empty body.

    Smaller subset sizes are just a head() slice of this same list, so
    every size stays a consistent "most recent" prefix of the next size up.
    """
    conversations: list[dict[str, object]] = []
    group_keys = ["export_source", "conversation_title", "conversation_body"]
    groups = dict(iter(df.groupby(group_keys, dropna=False)))
    groups = merge_empty_body_duplicates(groups)
    for (export_source, title, body), group in groups.items():
        language = detect_language(title, body)
        if language != TARGET_LANGUAGE:
            continue

        # Exact-duplicate opinion text can appear more than once (e.g. re-imports,
        # or the same conversation resubmitted under a different conversation_id);
        # keep only the most recent occurrence of each distinct opinion.
        deduped = group.sort_values("seed_opinion_created_at", ascending=False).drop_duplicates(
            subset=["seed_opinion_text"], keep="first"
        )
        latest = deduped.head(max_n)
        # Represent the merged group with the conversation_id behind its most
        # recent opinion — an arbitrary but consistent choice among duplicates.
        representative_conversation_id = deduped.iloc[0]["conversation_id"]
        conversations.append(
            {
                "export_source": export_source,
                "conversation_id": representative_conversation_id,
                "conversation_title": title,
                "conversation_body": body,
                "language": language,
                "opinions": [
                    {"text": r["seed_opinion_text"], "created_at": r["seed_opinion_created_at"]}
                    for _, r in latest.iterrows()
                ],
            }
        )
    return conversations


def build_rows(conversations: list[dict[str, object]], n: int) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for conv in conversations:
        # Siblings always come from the full pool (up to OPINIONS_PER_TOPIC), not just
        # the `n` opinions this tier emits as their own row — so a tier that emits only
        # 1 row per topic still carries real sibling context from the other pool opinions.
        pool_texts = [o["text"] for o in conv["opinions"]]
        selected = conv["opinions"][:n]
        for rank, opinion in enumerate(selected, start=1):
            siblings = [t for t in pool_texts if t != opinion["text"]]
            rows.append(
                {
                    "export_source": conv["export_source"],
                    "conversation_id": conv["conversation_id"],
                    "conversation_title": conv["conversation_title"],
                    "conversation_body": conv["conversation_body"],
                    "language": conv["language"],
                    "seed_opinion": opinion["text"],
                    "created_at": opinion["created_at"].isoformat(),
                    "rank": rank,
                    "sibling_seed_opinions": siblings,
                }
            )
    return rows


def build_set_rows(conversations: list[dict[str, object]]) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for conv in conversations:
        pool_texts = [o["text"] for o in conv["opinions"]]
        for sibling_context, siblings in (("with", pool_texts), ("without", [])):
            rows.append(
                {
                    "export_source": conv["export_source"],
                    "conversation_id": conv["conversation_id"],
                    "conversation_title": conv["conversation_title"],
                    "conversation_body": conv["conversation_body"],
                    "language": conv["language"],
                    "sibling_context": sibling_context,
                    "sibling_seed_opinions": siblings,
                }
            )
    return rows


def write_jsonl(rows: list[dict[str, object]], path: Path) -> None:
    with path.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


def main() -> None:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    raw = load_raw()
    cleaned = clean(raw)
    conversations = french_conversations_sorted_by_recency(cleaned, OPINIONS_PER_TOPIC)
    print(f"Found {len(conversations)} French-language conversations")

    for size_name, size in SUBSET_SIZES.items():
        n, topics = size["n"], size["topics"]
        size_conversations = conversations[:topics] if topics is not None else conversations
        rows = build_rows(size_conversations, n)
        output = PROCESSED_DIR / f"{size_name}{len(rows)}.jsonl"
        write_jsonl(rows, output)
        print(
            f"\n[{size_name}] wrote {len(rows)} opinions "
            f"(up to {n} per conversation, {len(size_conversations)} conversations) -> {output}"
        )

    for size_name, topics in SET_SUBSET_TOPICS.items():
        size_conversations = conversations[:topics] if topics is not None else conversations
        rows = build_set_rows(size_conversations)
        output = PROCESSED_DIR / f"{size_name}{len(rows)}.jsonl"
        write_jsonl(rows, output)
        print(
            f"\n[{size_name}] wrote {len(rows)} rows "
            f"({len(size_conversations)} conversations, with and without siblings) -> {output}"
        )


if __name__ == "__main__":
    main()
