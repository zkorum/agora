from __future__ import annotations

import csv
from io import StringIO

from pydantic import BaseModel

from import_worker.import_models import (
    CommentCsvRow,
    ImportPolisResults,
    PolisComment,
    PolisConversationData,
    PolisVoteRecord,
    SummaryCsvRow,
    VoteCsvRow,
)

SUMMARY_FILE = "summaryFile"
COMMENTS_FILE = "commentsFile"
VOTES_FILE = "votesFile"


def _parse_summary_csv(content: str) -> SummaryCsvRow:
    data: dict[str, str] = {}
    for row in csv.reader(StringIO(content), skipinitialspace=True):
        if len(row) >= 2:
            data[row[0].strip()] = row[1].strip()
    return SummaryCsvRow.model_validate(data)


def _parse_table_csv[T: BaseModel](
    *,
    content: str,
    row_model: type[T],
    name: str,
) -> list[T]:
    rows: list[T] = []
    errors: list[str] = []
    reader = csv.DictReader(StringIO(content), skipinitialspace=True)
    for row_number, row in enumerate(reader, start=2):
        try:
            rows.append(row_model.model_validate(row))
        except Exception as error:
            errors.append(f"Row {row_number}: {error}")
            if len(errors) >= 10:
                break

    if errors:
        raise ValueError(f"{name} CSV validation failed:\n" + "\n".join(errors))
    if not rows:
        raise ValueError(f"{name} CSV contains no data rows")
    return rows


def build_import_from_csv(files: dict[str, str]) -> ImportPolisResults:
    summary_content = files.get(SUMMARY_FILE)
    comments_content = files.get(COMMENTS_FILE)
    votes_content = files.get(VOTES_FILE)
    if summary_content is None or comments_content is None or votes_content is None:
        raise ValueError("CSV import requires summary, comments, and votes files")

    summary = _parse_summary_csv(summary_content)
    comments = _parse_table_csv(
        content=comments_content,
        row_model=CommentCsvRow,
        name="Comments",
    )
    votes = _parse_table_csv(
        content=votes_content,
        row_model=VoteCsvRow,
        name="Votes",
    )

    sorted_votes = sorted(votes, key=lambda row: row.timestamp)
    deduplicated_votes: dict[tuple[int, int], VoteCsvRow] = {}
    for vote in sorted_votes:
        deduplicated_votes[(vote.voter_id, vote.comment_id)] = vote

    return ImportPolisResults(
        report_id=None,
        conversation_id=None,
        conversation_data=PolisConversationData(
            topic=summary.topic,
            description=summary.conversation_description or "",
            ownername=None,
            created=None,
            participant_count=summary.voters,
            link_url=str(summary.url) if summary.url not in (None, "") else None,
            conversation_id=None,
        ),
        comments_data=[
            PolisComment(
                statement_id=comment.comment_id,
                participant_id=comment.author_id,
                txt=comment.comment_body,
                moderated=comment.moderated,
                active=True,
                agree_count=comment.agrees,
                disagree_count=comment.disagrees,
                pass_count=None,
                created=comment.datetime,
                datetime=comment.datetime,
                is_seed=None,
            )
            for comment in comments
        ],
        votes_data=[
            PolisVoteRecord(
                statement_id=vote.comment_id,
                participant_id=vote.voter_id,
                vote=vote.vote,
                conversation_id=None,
                datetime=vote.datetime,
                modified=None,
                weight_x_32767=None,
            )
            for vote in deduplicated_votes.values()
        ],
    )
