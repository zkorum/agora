from pydantic import BaseModel, ValidationError
from typing import Optional, Union, List
from flask import Flask, jsonify, request, abort
from reddwarf.data_loader import Loader
from reddwarf.implementations.polis import run_pipeline
import logging

from pprint import pprint

app = Flask(__name__)


def assert_fully_populated(loader, ignore=[]):
    """A helper to ensure at least one item, and a single key in each data type."""
    assert len(loader.comments_data) > 0
    assert len(loader.votes_data) > 0
    if "math_data" not in ignore:
        assert len(loader.math_data.keys()) > 0
    if "conversation_data" not in ignore:
        assert len(loader.conversation_data.keys()) > 0


def print_summary(loader: Loader):
    print(f"--- Comment count: {len(loader.comments_data)}")
    print("--- First item:")
    pprint(loader.comments_data[:1])
    # print("--------")
    print(f"--- Vote count: {len(loader.votes_data)}")
    print("--- First item:")
    pprint(loader.votes_data[:1])
    # print("--------")
    print(f"--- Math object keys: {list(loader.math_data.keys())}")
    # print("--------")
    print(f"--- Conversation object keys: {list(loader.conversation_data.keys())}")


@app.route("/import")
def importConversation():
    polis_id = request.args.get("report_id")
    if polis_id is None:
        polis_id = request.args.get("conversation_id")
        if polis_id is None:
            abort(
                400,
                description="Missing required query parameter. Expected either 'report_id' or 'conversation_id'.",
            )
        else:
            print(f"Loading Polis conversation from conversation_id={polis_id}")
    else:
        print(f"Loading Polis conversation from report_id={polis_id}")
    loader = Loader(polis_id=polis_id, data_source="csv_export")
    loader.load_api_data_conversation()  # see https://github.com/polis-community/red-dwarf/blob/main/docs/notebooks/loading-data.ipynb "math_data and conversation_data only populate from the "api" data_source."
    assert_fully_populated(loader, ignore=["math_data", "conversation_data"])
    print_summary(loader)
    return jsonify(
        {
            # "report_id": loader.report_id,
            # "conversation_id": loader.conversation_id,
            # "conversation_data": loader.conversation_data,
            # "comments_data": loader.comments_data,
            "votes_data": loader.votes_data,
        }
    )


# --- Define TypedDicts ---
# Required fields only


class VoteRecord(BaseModel):
    participant_id: Union[str, int]
    statement_id: Union[str, int]
    vote: int
    conversation_id: Optional[Union[str, int]] = None
    datetime: Optional[str] = None
    modified: Optional[float] = None
    weight_x_32767: Optional[int] = None


class MathRequest(BaseModel):
    conversation_slug_id: str
    conversation_id: int
    votes: List[VoteRecord]


@app.route("/math", methods=["POST"])
def get_math_results():
    try:
        payload = MathRequest(**request.get_json())
    except ValidationError as e:
        abort(400, description=f"Validation error: {e}")
    logging.info(
        f"Processing math results for conversation '{payload.conversation_slug_id}' "
        f"(ID: {payload.conversation_id}) with {len(payload.votes)} votes."
    )
    print("Payload", payload)
    votes = [vote.model_dump() for vote in payload.votes]
    print("Votes", votes)

    try:
        # run_pipeline(votes=votes, min_user_vote_threshold=min(4, total_unmoderated_statements)) ? with total_unmoderated_statements sent via API, or better
        result = run_pipeline(votes=votes, min_user_vote_threshold=4)
    except Exception as err:
        print(
            "Error while running pipeline. If TypeError, it's likely there aren't enough participants and votes yet"
        )
        print("\n")
        print(err)
        print("\n")
        print("Returning an object with empty values")
        return jsonify(
            {
                "statements_df": [],
                "participants_df": [],
                "repness": {},
                "group_comment_stats": {},
                "consensus": {"agree": [], "disagree": []},
            }
        ), 200

    group_stats_df = (
        result.group_comment_stats.reset_index()
    )  # brings group_id, statement_id into columns

    group_comment_stats = {}

    for group_id, group_df in group_stats_df.groupby("group_id"):
        int_group_id = str(group_id)
        group_comment_stats[int_group_id] = group_df.drop(columns=["group_id"]).to_dict(
            orient="records"
        )

    print("\n\n")
    print(
        "statements_df",
        result.statements_df.reset_index().to_dict(orient="records"),
    )
    print("\n\n")
    print(
        "participants_df",
        result.participants_df.reset_index().to_dict(orient="records"),
    )
    print("\n\n")
    print("group_comment_stats", group_comment_stats)
    print("\n\n")
    print("consensus", result.consensus)
    print("\n\n")
    print("repness", result.repness)
    print("\n\n")

    return jsonify(
        {
            "statements_df": result.statements_df.reset_index().to_dict(
                orient="records"
            ),
            "participants_df": result.participants_df.reset_index().to_dict(
                orient="records"
            ),
            "repness": result.repness,
            "group_comment_stats": group_comment_stats,
            "consensus": result.consensus,
        }
    ), 200
