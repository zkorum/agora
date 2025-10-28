from pydantic import BaseModel, ValidationError
from typing import Optional, Union, List, TypedDict, cast
from flask import Flask, jsonify, request, abort, Response
from reddwarf.data_loader import Loader
from reddwarf.implementations.polis import run_pipeline
import logging
import sys
import traceback
from datetime import datetime
from logging.handlers import RotatingFileHandler
import pandas as pd

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
def importConversation() -> Response:
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
    else:  # conversation_id is not None
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


class ConsensusStatement(TypedDict):
    tid: int
    n_success: int
    n_trials: int
    p_success: float
    p_test: float
    cons_for: str


class Consensus(TypedDict):
    agree: List[ConsensusStatement]
    disagree: List[ConsensusStatement]


class RepnessStatement(TypedDict):
    tid: int
    n_success: int
    n_trials: int
    p_success: float
    p_test: float
    repness: float
    repness_test: float
    repful_for: str  # Literal["agree", "disagree"] but simplified for compatibility
    best_agree: Union[bool, None]  # NotRequired in TypedDict
    n_agree: Union[int, None]  # NotRequired in TypedDict


# PolisRepness is dict[str | GroupId, list[PolisRepnessStatement]]
# GroupId is an int, so the key can be str or int
Repness = dict[Union[str, int], List[RepnessStatement]]


class MathResult(TypedDict):
    statements_df: List[dict]
    participants_df: List[dict]
    repness: Repness
    group_comment_stats: dict
    consensus: Consensus


def convert_to_json_serializable(obj):
    """
    Recursively converts pandas Series, DataFrames, and other non-JSON-serializable
    types to JSON-serializable formats.
    """
    if isinstance(obj, pd.Series):
        return obj.to_dict()
    elif isinstance(obj, pd.DataFrame):
        return obj.to_dict(orient="records")
    elif isinstance(obj, dict):
        return {key: convert_to_json_serializable(value) for key, value in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [convert_to_json_serializable(item) for item in obj]
    else:
        return obj


def calculate_distribution_imbalance(member_counts):
    """
    Calculate how imbalanced the distribution is across groups.
    Returns a coefficient where:
    - 0 means perfectly balanced
    - Higher values mean more imbalanced

    Uses coefficient of variation (std dev / mean) as a measure.
    """
    if len(member_counts) < 2:
        return 0

    total_members = sum(member_counts)
    if total_members == 0:
        return 0

    mean = total_members / len(member_counts)

    # Calculate standard deviation
    variance = sum((x - mean) ** 2 for x in member_counts) / len(member_counts)
    std_dev = variance**0.5

    # Coefficient of variation
    cv = std_dev / mean
    return cv


def should_scale_based_on_distribution(member_counts, total_members):
    """
    Determine if we should scale up or down based on distribution.

    Returns:
    - "up": should add a group
    - "down": should remove a group
    - None: distribution is acceptable
    """
    if len(member_counts) < 2:
        return None

    num_groups = len(member_counts)
    min_members = min(member_counts)

    # Special case: very small populations (< 10 total)
    # Don't worry about distribution, only about minimum group size
    if total_members < 10:
        # Only scale down if there's a group with < 2 members and we have 3+ groups
        if min_members < 2 and num_groups >= 3:
            return "down"
        return None

    # For larger populations, check distribution balance
    imbalance = calculate_distribution_imbalance(member_counts)

    # Scale down if:
    # 1. There's a group with < 2 members and we have 3+ groups
    # 2. OR smallest group has < 10 members when total > 100 (too tiny relatively)
    # IMPORTANT: Never scale down to fewer than 2 groups (2 is minimum for meaningful clustering)
    if min_members < 2 and num_groups >= 3:
        logger.info(f"Scaling down: group with {min_members} members (< 2)")
        return "down"

    if total_members > 100 and min_members < 10 and imbalance > 0.9 and num_groups > 2:
        logger.info(
            f"Scaling down: severe imbalance (CV={imbalance:.2f}), "
            f"smallest group has only {min_members}/{total_members} members"
        )
        return "down"

    # If we have 2 groups with severe imbalance, try scaling UP instead
    if num_groups == 2 and total_members > 100 and min_members < 10 and imbalance > 0.9:
        logger.info(
            f"Scaling up: 2 groups with severe imbalance (CV={imbalance:.2f}), "
            f"trying 3 groups to improve distribution"
        )
        return "up"

    # Scale up if we can improve distribution (favor more groups):
    # 1. For 10-20 members: if we have 2 groups, imbalance > 0.8, and min < 2, try 3 groups
    # 2. For 20-30 members: if we have 2 groups and imbalance > 0.6, try 3 groups
    # 3. For 30-50 members: if imbalance > 0.6, add a group (up to 4)
    # 4. For 50+ members: if imbalance > 0.5, add a group (up to max)

    if (
        total_members >= 10
        and total_members < 20
        and num_groups == 2
        and imbalance > 0.8
        and min_members < 2
    ):
        logger.info(
            f"Scaling up: {total_members} members with severe imbalance (CV={imbalance:.2f}) "
            f"and tiny group ({min_members} member) - trying 3 groups"
        )
        return "up"

    if (
        total_members >= 20
        and total_members < 30
        and num_groups == 2
        and imbalance > 0.6
    ):
        logger.info(
            f"Scaling up: {total_members} members with high imbalance (CV={imbalance:.2f}) "
            f"in {num_groups} groups - trying 3 groups"
        )
        return "up"

    if total_members >= 30 and num_groups < 4 and imbalance > 0.6:
        logger.info(
            f"Scaling up: {total_members} members with imbalance (CV={imbalance:.2f}) "
            f"in {num_groups} groups - adding another group"
        )
        return "up"

    if total_members >= 50 and num_groups < 6 and imbalance > 0.5:
        logger.info(
            f"Scaling up: {total_members} members with imbalance (CV={imbalance:.2f}) "
            f"in {num_groups} groups - adding another group for better distribution"
        )
        return "up"

    return None


def get_maths(
    votes,
    min_user_vote_threshold,
    max_group_count=6,
    force_group_count=None,
    just_scaled_down=False,
    just_scaled_up=False,
    previous_result=None,  # Store previous attempt for comparison
) -> MathResult:
    logger.info(
        f"Using min_user_vote_threshold='{min_user_vote_threshold}' and max_group_count={max_group_count}"
    )

    try:
        if force_group_count is not None:
            result = run_pipeline(
                votes=votes,
                min_user_vote_threshold=min_user_vote_threshold,
                force_group_count=force_group_count,
            )
        else:
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

    # Drop participants without a cluster_id (unclustered)
    df = result.participants_df.dropna(subset=["cluster_id"]).copy()
    # Loop through each unique cluster and collect member counts
    member_counts = []
    for cluster_id in sorted(df["cluster_id"].unique()):
        members = df[df["cluster_id"] == cluster_id].index.tolist()
        num_members = len(members)
        member_counts.append(num_members)
        if num_members == 0:
            # 0 participant - should not happen but log if it does
            logger.warning(
                f"Warning: cluster {cluster_id} has {num_members} participants!"
            )

    total_members = sum(member_counts)
    number_of_groups = len(group_comment_stats.keys())

    logger.info(
        f"Distribution: {number_of_groups} groups with member counts {member_counts} "
        f"(total: {total_members} members)"
    )

    # Build current result
    current_result = {
        "statements_df": result.statements_df.reset_index().to_dict(orient="records"),
        "participants_df": result.participants_df.reset_index().to_dict(
            orient="records"
        ),
        "repness": cast(Repness, convert_to_json_serializable(result.repness)),
        "group_comment_stats": group_comment_stats,
        "consensus": cast(Consensus, convert_to_json_serializable(result.consensus)),
    }

    current_imbalance = calculate_distribution_imbalance(member_counts)

    # If we just scaled, compare with previous result and pick the better one
    if (just_scaled_down or just_scaled_up) and previous_result is not None:
        previous_member_counts = previous_result["member_counts"]
        previous_imbalance = previous_result["imbalance"]

        logger.info(
            f"Comparing results: previous imbalance={previous_imbalance:.2f} "
            f"with {len(previous_member_counts)} groups {previous_member_counts}, "
            f"current imbalance={current_imbalance:.2f} "
            f"with {len(member_counts)} groups {member_counts}"
        )

        # Choose the result with better (lower) imbalance
        if previous_imbalance < current_imbalance:
            logger.info(
                f"Previous distribution was better (CV {previous_imbalance:.2f} < {current_imbalance:.2f}), "
                f"reverting to {len(previous_member_counts)} groups"
            )
            # Return the previous result's data (without metadata)
            return previous_result["data"]
        else:
            logger.info(
                f"Current distribution is better (CV {current_imbalance:.2f} <= {previous_imbalance:.2f}), "
                f"keeping {len(member_counts)} groups"
            )
            return current_result

    # Determine if we should scale based on distribution
    # Only scale if we haven't just scaled (prevent oscillation)
    if not just_scaled_down and not just_scaled_up:
        scale_action = should_scale_based_on_distribution(member_counts, total_members)

        if scale_action == "down":
            new_force_group_count = number_of_groups - 1
            logger.info(
                f"Recalculating with max {new_force_group_count} groups (scaling down)"
            )
            # Pass current result + metadata for comparison
            return get_maths(
                votes=votes,
                min_user_vote_threshold=min_user_vote_threshold,
                force_group_count=new_force_group_count,
                just_scaled_down=True,
                previous_result={
                    "data": current_result,
                    "member_counts": member_counts,
                    "imbalance": current_imbalance,
                },
            )
        elif scale_action == "up":
            new_force_group_count = number_of_groups + 1
            logger.info(
                f"Recalculating with min {new_force_group_count} groups (scaling up)"
            )
            # Pass current result + metadata for comparison
            return get_maths(
                votes=votes,
                min_user_vote_threshold=min_user_vote_threshold,
                force_group_count=new_force_group_count,
                just_scaled_up=True,
                previous_result={
                    "data": current_result,
                    "member_counts": member_counts,
                    "imbalance": current_imbalance,
                },
            )

    # No scaling needed, return current result
    return current_result


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
