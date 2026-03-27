"""COCM-adapted voting rights for Solidago aggregation.

Adapts Connection-Oriented Cluster Match (COCM) from quadratic funding
to per-user-per-entity voting weights. Uses the friend_matrix concept
from COCM to attenuate the influence of socially connected voters.

Based on:
- Miller, Weyl, Erichsen (2022), "Beyond Collusion Resistance:
  Leveraging Social Information for Plural Funding and Voting"
  https://ssrn.com/abstract=4311507
- Reference implementations:
  - external/plural-qf/pluralqf.py (MIT, Joel Miller)
  - external/COQF/COQF.py (MIT, Joel Miller)
  - external/qf-variants/qf-variants.py (GPL v3)

Adaptation from QF to voting rights:
- QF COCM computes a total funding amount for a project using group-pair
  interaction terms attenuated by the K function (Eq. 15-16).
- We compute per-user-per-entity voting rights based on how many
  co-scorers each user is connected to via the friend_matrix.
- Formula: voting_right[i, X] = trust_i / sqrt(1 + connected_co_scorers_i)
  where connected_co_scorers_i = |{j : j scored X, j≠i, friend_matrix[i][j] > 0}|
- This gives O(sqrt) growth for groups of connected voters, matching
  COCM's proven collusion resistance property (Theorem 1 in the paper).
- We deliberately omit the |T_i| division from Cluster Match (Eq. 8)
  because it penalizes users for being in more groups, which is undesirable
  for voting rights (unlike QF where it prevents double-counting).
"""

import math
from dataclasses import dataclass


# ---------------------------------------------------------------------------
# Types (shared with main.py endpoint models)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class UserGroupEntry:
    user_id: int
    group_id: int


@dataclass(frozen=True)
class GroupSource:
    source_id: str
    memberships: list[UserGroupEntry]


# ---------------------------------------------------------------------------
# Friend matrix
# ---------------------------------------------------------------------------


def build_friend_matrix(
    *,
    group_sources: list[GroupSource],
    user_ids: list[int],
) -> dict[int, dict[int, int]]:
    """Build a friend matrix from multiple group sources.

    friend_matrix[i][j] = number of groups that users i and j share
    across ALL sources. This is |T_i ∩ T_j| from the paper (Section 1.3).

    The friend_matrix is the core data structure that COCM uses to detect
    social connections between voters (Eq. 15: K function).

    Parameters
    ----------
    group_sources : list of group sources, each providing a partition of users
    user_ids : all user IDs to include (even if not in any group)

    Returns
    -------
    dict[int, dict[int, int]] : friend_matrix[i][j] = shared group count
    """
    fm: dict[int, dict[int, int]] = {uid: {uid2: 0 for uid2 in user_ids} for uid in user_ids}

    for source in group_sources:
        # Group users by their group_id in this source
        groups: dict[int, list[int]] = {}
        for entry in source.memberships:
            if entry.user_id in fm:  # only count users we care about
                groups.setdefault(entry.group_id, []).append(entry.user_id)

        # Users in the same group share this source's group
        for members in groups.values():
            for i in range(len(members)):
                for j in range(i + 1, len(members)):
                    uid_a, uid_b = members[i], members[j]
                    fm[uid_a][uid_b] += 1
                    fm[uid_b][uid_a] += 1

    return fm


# ---------------------------------------------------------------------------
# COCM-adapted voting rights
# ---------------------------------------------------------------------------


class COCMVotingRights:
    """Per-user-per-entity voting rights based on COCM's friend_matrix.

    For each entity, computes how many co-scorers each user is connected to
    (via shared group memberships), then attenuates their voting right
    proportional to sqrt(1 + connections).

    This implements the COCM principle: connected voters (who share social
    groups) have their collective influence reduced, while independent
    voters retain full weight. The binary K function (Eq. 15) determines
    connection: any shared group = connected.
    """

    def __init__(self, *, group_sources: list[GroupSource]) -> None:
        self._group_sources = group_sources

    def compute_entity_voting_rights(
        self,
        *,
        scorers: list[int],
        trust_scores: dict[int, float],
        user_ids: list[int],
    ) -> dict[int, float]:
        """Compute voting rights for one entity.

        Parameters
        ----------
        scorers : user IDs who scored this entity
        trust_scores : base trust per user (from verification level)
        user_ids : all user IDs (for friend_matrix construction)

        Returns
        -------
        dict mapping scorer user_id → voting_right (float)
        """
        if not scorers:
            return {}

        scorer_set = set(scorers)

        # Build friend matrix for relevant users
        fm = build_friend_matrix(
            group_sources=self._group_sources,
            user_ids=user_ids,
        )

        rights: dict[int, float] = {}
        for user in scorers:
            trust = trust_scores.get(user, 1.0)

            # Count connected co-scorers (Paper Eq. 15: K function, binary)
            # Connected = shares at least one group (friend_matrix > 0)
            connected_co_scorers = sum(
                1 for other in scorer_set
                if other != user and fm.get(user, {}).get(other, 0) > 0
            )

            # COCM attenuation: trust / sqrt(1 + connections)
            # - 0 connections → full trust (independent voter)
            # - N connections → trust / sqrt(N+1) (attenuated)
            # This gives O(sqrt) collective growth for a group of K
            # connected voters: K * trust/sqrt(K) = trust * sqrt(K)
            rights[user] = trust / math.sqrt(1 + connected_co_scorers)

        return rights
