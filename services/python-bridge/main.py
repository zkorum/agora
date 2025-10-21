from pydantic import BaseModel, ValidationError
from typing import Optional, Union, List, TypedDict
from flask import Flask, jsonify, request, abort
from reddwarf.data_loader import Loader
from reddwarf.implementations.polis import run_pipeline
import logging
import sys
import traceback
from datetime import datetime
from logging.handlers import RotatingFileHandler

from pprint import pprint

# Configure logging to both file and console
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        RotatingFileHandler("flask.log", maxBytes=10 * 1024 * 1024, backupCount=5),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

logger.info("Flask app initialized")


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
    print(f"--- Conversation created: {loader.conversation_data.get('created')}")


@app.route("/import")
def importConversation():
    report_id = request.args.get("report_id")
    conversation_id = request.args.get("conversation_id")
    if report_id is None and conversation_id is None:
        abort(
            400,
            description="Missing required query parameter. Expected either 'report_id' or 'conversation_id'.",
        )
    if report_id is not None:
        print(f"Loading Polis conversation from report_id={report_id}")
        loader = Loader(polis_id=report_id, data_source="csv_export")
        loader.load_api_data_conversation()  # see https://github.com/polis-community/red-dwarf/blob/main/docs/notebooks/loading-data.ipynb "math_data and conversation_data only populate from the "api" data_source."
        assert_fully_populated(loader, ignore=["math_data"])
        # print_summary(loader)
        return jsonify(
            {
                "report_id": loader.report_id,
                "conversation_id": loader.conversation_id,
                "conversation_data": loader.conversation_data,
                "comments_data": loader.comments_data,
                "votes_data": loader.votes_data,
            }
        )
    if conversation_id is not None:
        logger.info(
            f"Loading Polis conversation from conversation_id={conversation_id}"
        )
        loader = Loader(polis_id=conversation_id)
        assert_fully_populated(loader, ignore=["math_data"])
        logger.info("Polis conversation loaded")
        # print_summary(loader)
        return jsonify(
            {
                "report_id": loader.report_id,
                "conversation_id": loader.conversation_id,
                "conversation_data": loader.conversation_data,
                "comments_data": loader.comments_data,
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


class Consensus(TypedDict):
    agree: List
    disagree: List


class MathResult(TypedDict):
    statements_df: List
    participants_df: List
    repness: dict
    group_comment_stats: dict
    consensus: Consensus


def get_maths(votes, min_user_vote_threshold, max_group_count=6) -> MathResult:
    logger.info(
        f"Using min_user_vote_threshold='{min_user_vote_threshold}' and max_group_count={max_group_count}"
    )

    try:
        result = run_pipeline(
            votes=votes,
            min_user_vote_threshold=min_user_vote_threshold,
            max_group_count=max_group_count,
        )
    except Exception as err:
        logger.error(
            "Error while running pipeline. If TypeError, it's likely there aren't enough participants and votes yet"
        )
        logger.error(f"Error: {err}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        logger.info("Returning an object with empty values")
        return {
            "statements_df": [],
            "participants_df": [],
            "repness": {},
            "group_comment_stats": {},
            "consensus": {"agree": [], "disagree": []},
        }

    group_stats_df = (
        result.group_comment_stats.reset_index()
    )  # brings group_id, statement_id into columns

    group_comment_stats = {}

    for group_id, group_df in group_stats_df.groupby("group_id"):
        int_group_id = str(group_id)
        group_comment_stats[int_group_id] = group_df.drop(columns=["group_id"]).to_dict(
            orient="records"
        )

    has_group_with_strictly_less_than_two_members = False
    # Drop participants without a cluster_id (unclustered)
    df = result.participants_df.dropna(subset=["cluster_id"]).copy()
    # Loop through each unique cluster
    for cluster_id in sorted(df["cluster_id"].unique()):
        members = df[df["cluster_id"] == cluster_id].index.tolist()
        num_members = len(members)
        if num_members < 2:
            has_group_with_strictly_less_than_two_members = True
            if num_members != 1:
                # 0 participant
                logger.warning(f"Warning: a cluster has {num_members} participant!")

    number_of_groups = len(group_comment_stats.keys())
    if number_of_groups >= 3 and has_group_with_strictly_less_than_two_members:
        new_max_group_count = number_of_groups - 1
        logger.info(
            f"'{number_of_groups}' clusters found with at least one of them having 1 participant or less, recalculating maths by enforcing '{new_max_group_count}' groups maximum"
        )
        return get_maths(
            votes=votes,
            min_user_vote_threshold=min_user_vote_threshold,
            max_group_count=new_max_group_count,
        )

    # print("\n\n")
    # print(
    #     "statements_df",
    #     result.statements_df.reset_index().to_dict(orient="records"),
    # )
    # print("\n\n")
    # print(
    #     "participants_df",
    #     result.participants_df.reset_index().to_dict(orient="records"),
    # )
    # print("\n\n")
    # print("group_comment_stats", group_comment_stats)
    # print("\n\n")
    # print("consensus", result.consensus)
    # print("\n\n")
    # print("repness", result.repness)
    # print("\n\n")
    return {
        "statements_df": result.statements_df.reset_index().to_dict(orient="records"),
        "participants_df": result.participants_df.reset_index().to_dict(
            orient="records"
        ),
        "repness": result.repness,
        "group_comment_stats": group_comment_stats,
        "consensus": result.consensus,
    }


@app.route("/math", methods=["POST"])
def get_math_results():
    start_time = datetime.now()

    # Log request details
    content_length = request.content_length
    logger.info(f"Received POST /math request (Content-Length: {content_length} bytes)")

    try:
        # Parse the request body
        json_data = request.get_json()
        if json_data is None:
            logger.error("Request body is empty or not valid JSON")
            abort(400, description="Request body must be valid JSON")

        logger.info("Successfully parsed JSON body")

        # Validate with Pydantic
        payload = MathRequest(**json_data)
        logger.info(
            f"Processing math results for conversation '{payload.conversation_slug_id}' "
            f"(ID: {payload.conversation_id}) with {len(payload.votes)} votes."
        )

    except ValidationError as e:
        logger.error(f"Validation error: {e}")
        abort(400, description=f"Validation error: {e}")
    except Exception as e:
        logger.error(f"Error parsing request: {e}", exc_info=True)
        abort(400, description=f"Error parsing request: {str(e)}")

    try:
        votes = [vote.model_dump() for vote in payload.votes]
        min_user_vote_threshold = 7  # same value as polis

        logger.info(
            f"Starting math calculation with min_user_vote_threshold={min_user_vote_threshold}"
        )
        result = get_maths(votes=votes, min_user_vote_threshold=min_user_vote_threshold)

        elapsed = (datetime.now() - start_time).total_seconds()
        logger.info(f"Successfully completed math calculation in {elapsed:.2f}s")

        return jsonify(result)

    except Exception as e:
        elapsed = (datetime.now() - start_time).total_seconds()
        logger.error(
            f"Error during math calculation (after {elapsed:.2f}s): {e}", exc_info=True
        )
        abort(500, description=f"Error during math calculation: {str(e)}")


@app.before_request
def log_request_info():
    logger.info(
        f"Incoming request: {request.method} {request.path} from {request.remote_addr}"
    )


@app.after_request
def log_response_info(response):
    logger.info(f"Response: {response.status_code} for {request.method} {request.path}")
    return response


@app.errorhandler(413)
def request_entity_too_large(error):
    logger.error(f"Request entity too large: {request.content_length} bytes")
    return jsonify({"error": "Request entity too large"}), 413


@app.errorhandler(Exception)
def handle_exception(e):
    logger.error(f"Unhandled exception: {e}", exc_info=True)
    return jsonify({"error": str(e)}), 500
