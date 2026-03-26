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
    # If changing the CV threshold (0.9) below, also update CLUSTER_IMBALANCE_CV_THRESHOLD
    # in services/agora/src/utils/component/opinion.ts (and vice versa).
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


class PipelineOutput(TypedDict):
    result: MathResult
    member_counts: list[int]
    number_of_groups: int


def _run_and_build_result(
    votes,
    min_user_vote_threshold,
    conversation_slug_id,
    max_group_count=6,
    force_group_count=None,
) -> Optional[PipelineOutput]:
    """Run the reddwarf pipeline and convert results to JSON-serializable format.

    Returns None if the pipeline fails (e.g., not enough participants).
    """
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
        return None

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

    number_of_groups = len(group_comment_stats.keys())

    logger.info(
        f"[{conversation_slug_id}] Distribution: {number_of_groups} groups "
        f"with member counts {member_counts} (total: {sum(member_counts)} members)"
    )

    math_result: MathResult = {
        "statements_df": result.statements_df.reset_index().to_dict(orient="records"),
        "participants_df": result.participants_df.reset_index().to_dict(
            orient="records"
        ),
        "repness": cast(Repness, convert_to_json_serializable(result.repness)),
        "group_comment_stats": group_comment_stats,
        "consensus": cast(Consensus, convert_to_json_serializable(result.consensus)),
    }

    return {
        "result": math_result,
        "member_counts": member_counts,
        "number_of_groups": number_of_groups,
    }


EMPTY_RESULT: MathResult = {
    "statements_df": [],
    "participants_df": [],
    "repness": {},
    "group_comment_stats": {},
    "consensus": {"agree": [], "disagree": []},
}


def get_maths(
    votes,
    min_user_vote_threshold,
    conversation_slug_id,
    max_group_count=6,
    force_group_count=None,
) -> MathResult:
    logger.info(
        f"[{conversation_slug_id}] Using min_user_vote_threshold='{min_user_vote_threshold}' "
        f"and max_group_count={max_group_count}"
    )

    # Initial pipeline run
    output = _run_and_build_result(
        votes=votes,
        min_user_vote_threshold=min_user_vote_threshold,
        conversation_slug_id=conversation_slug_id,
        max_group_count=max_group_count,
        force_group_count=force_group_count,
    )
    if output is None:
        logger.info("Returning an object with empty values")
        return EMPTY_RESULT

    best_result = output["result"]
    best_member_counts = output["member_counts"]
    best_imbalance = calculate_distribution_imbalance(best_member_counts)
    current_group_count = output["number_of_groups"]

    # Iterative scaling loop: keep adjusting group count until distribution is acceptable.
    # Track the scaling direction to prevent oscillation (once we start scaling down,
    # we only continue down; same for up).
    scaling_direction = None  # "down" or "up" once decided

    while True:
        total_members = sum(best_member_counts)
        scale_action = should_scale_based_on_distribution(
            best_member_counts, total_members
        )

        if scale_action is None:
            break

        # Prevent oscillation: once committed to a direction, don't reverse
        if scaling_direction is not None and scale_action != scaling_direction:
            logger.info(
                f"[{conversation_slug_id}] Scaling wants '{scale_action}' but already "
                f"committed to '{scaling_direction}', stopping"
            )
            break

        if scale_action == "down":
            new_count = current_group_count - 1
            if new_count < 2:
                logger.info(
                    f"[{conversation_slug_id}] Can't scale below 2 groups, stopping"
                )
                break
        else:  # "up"
            new_count = current_group_count + 1
            if new_count > max_group_count:
                logger.info(
                    f"[{conversation_slug_id}] Can't scale above {max_group_count} groups, stopping"
                )
                break

        logger.info(
            f"[{conversation_slug_id}] Scaling {scale_action}: "
            f"trying {new_count} groups (from {current_group_count})"
        )

        new_output = _run_and_build_result(
            votes=votes,
            min_user_vote_threshold=min_user_vote_threshold,
            conversation_slug_id=conversation_slug_id,
            force_group_count=new_count,
        )
        if new_output is None:
            logger.info(
                f"[{conversation_slug_id}] Pipeline failed with {new_count} groups, "
                f"keeping {current_group_count}"
            )
            break

        new_member_counts = new_output["member_counts"]
        new_imbalance = calculate_distribution_imbalance(new_member_counts)

        logger.info(
            f"[{conversation_slug_id}] Comparing: {current_group_count} groups "
            f"(CV={best_imbalance:.2f}, counts={best_member_counts}) vs "
            f"{new_count} groups (CV={new_imbalance:.2f}, counts={new_member_counts})"
        )

        # Decide whether to accept the new result
        if scale_action == "down":
            # When scaling down, prioritize eliminating singletons
            old_has_singletons = (
                min(best_member_counts) < 2 and len(best_member_counts) >= 3
            )
            new_has_singletons = (
                min(new_member_counts) < 2 and len(new_member_counts) >= 3
            )

            if old_has_singletons and not new_has_singletons:
                # Singletons eliminated — always accept
                accept = True
            elif new_imbalance <= best_imbalance:
                # CV improved or same — accept
                accept = True
            elif old_has_singletons and new_has_singletons:
                # Both have singletons — accept to keep trying further down
                accept = True
            else:
                # CV got worse and no singleton improvement — stop
                accept = False
        else:  # "up"
            old_is_degenerate = (
                min(best_member_counts) < 2 and len(best_member_counts) == 2
            )
            if old_is_degenerate:
                accept = True
            else:
                accept = new_imbalance < best_imbalance

        if accept:
            logger.info(
                f"[{conversation_slug_id}] Accepted {new_count} groups"
            )
            best_result = new_output["result"]
            best_member_counts = new_member_counts
            best_imbalance = new_imbalance
            current_group_count = new_count
            scaling_direction = scale_action
        else:
            logger.info(
                f"[{conversation_slug_id}] Rejected {new_count} groups, "
                f"keeping {current_group_count}"
            )
            break

    return best_result


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

        if not votes:
            logger.info(
                f"No votes for conversation '{payload.conversation_slug_id}', returning empty results."
            )
            return jsonify(
                {
                    "statements_df": [],
                    "participants_df": [],
                    "repness": {},
                    "group_comment_stats": {},
                    "consensus": {"agree": [], "disagree": []},
                }
            )

        logger.info(
            f"Starting math calculation for conversation '{payload.conversation_slug_id}' with min_user_vote_threshold={min_user_vote_threshold}"
        )
        result = get_maths(
            votes=votes,
            min_user_vote_threshold=min_user_vote_threshold,
            conversation_slug_id=payload.conversation_slug_id,
        )

        elapsed = (datetime.now() - start_time).total_seconds()
        logger.info(f"Successfully completed math calculation in {elapsed:.2f}s")

        return jsonify(result)

    except Exception as e:
        elapsed = (datetime.now() - start_time).total_seconds()
        logger.error(
            f"Error during math calculation (after {elapsed:.2f}s): {e}", exc_info=True
        )
        abort(500, description=f"Error during math calculation: {str(e)}")


# ---------------------------------------------------------------------------
# MaxDiff scoring endpoint (Solidago integration)
# ---------------------------------------------------------------------------

from bws_conversion import BWSComparison, bws_to_pairwise
from entity_mapping import EntityIdMapper, map_pairwise_wins_to_solidago, map_scores_from_solidago

from solidago.pipeline import Pipeline
from solidago.trust_propagation import TrustPropagation
from solidago.preference_learning import UniformGBT
from solidago.voting_rights import AffineOvertrust
from solidago.scaling import NoScaling
from solidago.aggregation import EntitywiseQrQuantile
from solidago.post_process import NoPostProcess
from solidago.judgments import DataFrameJudgments
from solidago.privacy_settings import PrivacySettings


class IdentityTrustPropagation(TrustPropagation):
    """Pass-through trust propagation that preserves pre-set trust_score values.

    Solidago's built-in classes (TrustAll, NoTrustPropagation, LipschiTrust)
    all overwrite trust_score. This class keeps the values we set in the
    users DataFrame, allowing the caller to control trust via user_weights.
    """

    def __call__(self, users: pd.DataFrame, vouches: pd.DataFrame) -> pd.DataFrame:
        if "trust_score" not in users.columns:
            return users.assign(trust_score=1.0)
        return users


class BWSComparisonInput(BaseModel):
    user_id: int
    best: str
    worst: str
    candidate_set: list[str]


class PairwiseComparisonInput(BaseModel):
    user_id: int
    entity_a: str
    entity_b: str
    comparison: float
    comparison_max: float


class UserWeight(BaseModel):
    user_id: int
    weight: float


class UserGroupEntry(BaseModel):
    user_id: int
    group_id: int


class GroupSource(BaseModel):
    source_id: str
    memberships: list[UserGroupEntry]


class MaxDiffScoreRequest(BaseModel):
    conversation_slug_id: str
    entity_ids: list[str]
    bws_comparisons: list[BWSComparisonInput] | None = None
    pairwise_comparisons: list[PairwiseComparisonInput] | None = None
    user_weights: list[UserWeight] | None = None
    group_sources: list[GroupSource] | None = None
    group_combination_strategy: str = "composite"


def _warmup_solidago() -> None:
    """Trigger Numba JIT compilation at import time with a tiny dummy dataset."""
    dummy_df = pd.DataFrame({
        "user_id": [0, 0],
        "entity_a": [0, 1],
        "entity_b": [1, 2],
        "comparison": [1.0, 1.0],
        "comparison_max": [1.0, 1.0],
    })
    gbt = UniformGBT(prior_std_dev=7.0, convergence_error=1e-5)
    gbt.comparison_learning(dummy_df)
    logger.info("Solidago JIT warmup complete")


_warmup_solidago()


@app.route("/maxdiff-score", methods=["POST"])
def maxdiff_score():
    start_time = datetime.now()
    try:
        json_data = request.get_json()
        if json_data is None:
            return jsonify({"error": "Request body must be valid JSON"}), 400

        payload = MaxDiffScoreRequest(**json_data)
    except ValidationError as e:
        return jsonify({"error": str(e)}), 400

    # Validate: exactly one comparison type
    has_bws = payload.bws_comparisons is not None
    has_pairwise = payload.pairwise_comparisons is not None
    if has_bws == has_pairwise:
        return jsonify({
            "error": "Provide exactly one of bws_comparisons or pairwise_comparisons",
        }), 400

    logger.info(
        f"[MaxDiff] Scoring '{payload.conversation_slug_id}' "
        f"with {len(payload.entity_ids)} entities"
    )

    # Convert BWS to pairwise if needed
    if payload.bws_comparisons is not None:
        bws_list = [
            BWSComparison(
                user_id=c.user_id,
                best=c.best,
                worst=c.worst,
                candidate_set=c.candidate_set,
            )
            for c in payload.bws_comparisons
        ]
        pairwise_wins = bws_to_pairwise(
            bws_comparisons=bws_list,
            entity_ids=payload.entity_ids,
        )
    else:
        # Pairwise mode: convert PairwiseComparisonInput to PairwiseWin-like format
        # for entity mapping (winner=entity_a when comparison>0)
        from bws_conversion import PairwiseWin
        pairwise_wins = []
        for c in payload.pairwise_comparisons:
            if c.comparison > 0:
                pairwise_wins.append(PairwiseWin(user_id=c.user_id, winner=c.entity_a, loser=c.entity_b))
            elif c.comparison < 0:
                pairwise_wins.append(PairwiseWin(user_id=c.user_id, winner=c.entity_b, loser=c.entity_a))

    if not pairwise_wins:
        return jsonify({"scores": []})

    # Map string entity IDs to ints for Solidago
    mapper = EntityIdMapper(entity_ids=payload.entity_ids)
    solidago_comparisons = map_pairwise_wins_to_solidago(wins=pairwise_wins, mapper=mapper)

    comparisons_df = pd.DataFrame(solidago_comparisons)

    if comparisons_df.empty:
        return jsonify({"scores": []})

    # Build user DataFrame with trust scores
    user_ids = sorted(comparisons_df["user_id"].unique())
    weight_map: dict[int, float] = {}
    if payload.user_weights is not None:
        weight_map = {w.user_id: w.weight for w in payload.user_weights}

    users_df = pd.DataFrame(
        {
            "is_pretrusted": [True] * len(user_ids),
            "trust_score": [weight_map.get(int(uid), 1.0) for uid in user_ids],
        },
        index=pd.Index(user_ids, name="user_id"),
    )
    entities_df = pd.DataFrame(
        index=pd.Index(mapper.all_int_ids(), name="entity_id"),
    )
    vouches_df = pd.DataFrame(columns=["voucher", "vouchee", "vouch"])

    # Configure Solidago pipeline (production-tested defaults)
    pipeline = Pipeline(
        trust_propagation=IdentityTrustPropagation(),
        preference_learning=UniformGBT(prior_std_dev=7.0, convergence_error=1e-5),
        voting_rights=AffineOvertrust(
            privacy_penalty=0.5,
            min_overtrust=2.0,
            overtrust_ratio=0.1,
        ),
        scaling=NoScaling(),
        aggregation=EntitywiseQrQuantile(quantile=0.5, lipschitz=0.1),
        post_process=NoPostProcess(),
    )

    judgments = DataFrameJudgments(comparisons=comparisons_df)
    privacy = PrivacySettings()

    _, _, _, global_model = pipeline(
        users=users_df,
        vouches=vouches_df,
        entities=entities_df,
        privacy=privacy,
        judgments=judgments,
    )

    # Map int IDs back to strings
    solidago_scores = list(global_model.iter_entities())
    entity_scores = map_scores_from_solidago(
        solidago_scores=solidago_scores, mapper=mapper,
    )

    if not entity_scores:
        return jsonify({"scores": []})

    # Normalize scores to [0, 1]
    raw_scores = [s.score for s in entity_scores]
    min_score = min(raw_scores)
    max_score = max(raw_scores)
    score_range = max_score - min_score

    result_scores = []
    for s in entity_scores:
        # When scores are effectively equal (range < epsilon), treat as tied at 0.5
        if score_range < 1e-6:
            normalized = 0.5
        else:
            normalized = (s.score - min_score) / score_range
        result_scores.append({
            "entity_id": s.entity_id,
            "score": normalized,
            "uncertainty_left": s.uncertainty_left,
            "uncertainty_right": s.uncertainty_right,
        })

    result_scores.sort(key=lambda x: x["score"], reverse=True)

    elapsed = (datetime.now() - start_time).total_seconds()
    logger.info(f"[MaxDiff] Scored {len(result_scores)} entities in {elapsed:.2f}s")

    return jsonify({"scores": result_scores})


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
