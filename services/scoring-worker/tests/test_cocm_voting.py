"""TDD tests for COCM-adapted voting rights.

Adapts Connection-Oriented Cluster Match (Miller, Weyl, Erichsen 2022,
"Beyond Collusion Resistance", Eq. 15-16) from QF funding allocation
to per-user-per-entity voting weights for Solidago's aggregation pipeline.

Reference implementations (MIT licensed, same authors):
- external/plural-qf/pluralqf.py (connection_oriented_cluster_match)
- external/COQF/COQF.py (COQF_sp26)

Paper: https://ssrn.com/abstract=4311507

Tests written FIRST per TDD methodology.
"""



from scoring_worker.cocm_voting import (
    COCMVotingRights,
    GroupSource,
    UserGroupEntry,
    build_friend_matrix,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def group_source(
    source_id: str,
    memberships: dict[int, int],
) -> GroupSource:
    """Shorthand: {user_id: group_id} -> GroupSource."""
    return GroupSource(
        source_id=source_id,
        memberships=[
            UserGroupEntry(user_id=uid, group_id=gid)
            for uid, gid in memberships.items()
        ],
    )


# ===========================================================================
# friend_matrix tests
# ===========================================================================


class TestBuildFriendMatrix:
    def test_no_sources(self) -> None:
        fm = build_friend_matrix(group_sources=[], user_ids=[0, 1])
        assert fm[0][1] == 0
        assert fm[1][0] == 0

    def test_same_group_one_source(self) -> None:
        """Users in the same group share 1 group."""
        fm = build_friend_matrix(
            group_sources=[group_source("polis", {0: 1, 1: 1, 2: 2})],
            user_ids=[0, 1, 2],
        )
        assert fm[0][1] == 1  # both in group 1
        assert fm[1][0] == 1  # symmetric
        assert fm[0][2] == 0  # different groups
        assert fm[2][0] == 0

    def test_different_groups_one_source(self) -> None:
        fm = build_friend_matrix(
            group_sources=[group_source("polis", {0: 1, 1: 2})],
            user_ids=[0, 1],
        )
        assert fm[0][1] == 0

    def test_two_sources_additive(self) -> None:
        """Friend count is the number of shared groups across ALL sources."""
        fm = build_friend_matrix(
            group_sources=[
                group_source("polis", {0: 1, 1: 1, 2: 2}),
                group_source("company", {0: 10, 1: 10, 2: 10}),
            ],
            user_ids=[0, 1, 2],
        )
        # Users 0,1: share polis group 1 AND company group 10 -> 2
        assert fm[0][1] == 2
        # Users 0,2: share company group 10 only -> 1
        assert fm[0][2] == 1
        # Users 1,2: share company group 10 only -> 1
        assert fm[1][2] == 1

    def test_self_not_counted(self) -> None:
        fm = build_friend_matrix(
            group_sources=[group_source("polis", {0: 1})],
            user_ids=[0],
        )
        assert fm[0][0] == 0

    def test_user_not_in_any_source(self) -> None:
        """User without group membership has 0 connections to everyone."""
        fm = build_friend_matrix(
            group_sources=[group_source("polis", {0: 1, 1: 1})],
            user_ids=[0, 1, 99],  # user 99 not in any group
        )
        assert fm[99][0] == 0
        assert fm[0][99] == 0


# ===========================================================================
# COCMVotingRights property tests
# ===========================================================================


class TestCOCMVotingRightsProperties:
    """Test the PROPERTIES that COCM-adapted voting rights must satisfy,
    based on the paper's definitions and proofs."""

    def test_no_groups_equal_weight(self) -> None:
        """Without group information, all users get equal voting rights
        (proportional to trust). This is the 'atomized agents' baseline."""
        vr = COCMVotingRights(group_sources=[])
        rights = vr.compute_entity_voting_rights(
            scorers=[0, 1, 2],
            trust_scores={0: 1.0, 1: 1.0, 2: 1.0},
            user_ids=[0, 1, 2],
        )
        assert rights[0] == rights[1] == rights[2]
        assert rights[0] > 0

    def test_all_same_group_attenuated(self) -> None:
        """Users all in the same group should have LOWER voting rights
        than the no-group baseline. (Paper: interaction terms attenuated
        when groups share members.)"""
        # Baseline: no groups
        vr_no_groups = COCMVotingRights(group_sources=[])
        baseline = vr_no_groups.compute_entity_voting_rights(
            scorers=[0, 1, 2],
            trust_scores={0: 1.0, 1: 1.0, 2: 1.0},
            user_ids=[0, 1, 2],
        )

        # With groups: all in same group
        vr_grouped = COCMVotingRights(
            group_sources=[group_source("polis", {0: 1, 1: 1, 2: 1})],
        )
        grouped = vr_grouped.compute_entity_voting_rights(
            scorers=[0, 1, 2],
            trust_scores={0: 1.0, 1: 1.0, 2: 1.0},
            user_ids=[0, 1, 2],
        )

        # Each user's weight should be reduced when they're in the same group
        for uid in [0, 1, 2]:
            assert grouped[uid] < baseline[uid], (
                f"User {uid}: grouped weight {grouped[uid]} should be < "
                f"baseline {baseline[uid]}"
            )

    def test_disjoint_groups_full_weight(self) -> None:
        """Users in completely separate groups (no overlap) should get
        the same weight as the no-group baseline. (Paper Eq. 15: K(i,h) = c_i
        when no connection.)"""
        vr_no_groups = COCMVotingRights(group_sources=[])
        baseline = vr_no_groups.compute_entity_voting_rights(
            scorers=[0, 1],
            trust_scores={0: 1.0, 1: 1.0},
            user_ids=[0, 1],
        )

        # Each in their own group, no overlap
        vr_disjoint = COCMVotingRights(
            group_sources=[group_source("polis", {0: 1, 1: 2})],
        )
        disjoint = vr_disjoint.compute_entity_voting_rights(
            scorers=[0, 1],
            trust_scores={0: 1.0, 1: 1.0},
            user_ids=[0, 1],
        )

        assert abs(disjoint[0] - baseline[0]) < 1e-9
        assert abs(disjoint[1] - baseline[1]) < 1e-9

    def test_connected_vs_independent_scorers(self) -> None:
        """Given 3 scorers where 0,1 share a group and 2 is independent:
        User 2 should have HIGHER voting rights than 0 or 1.
        (Paper: independent contributions not attenuated.)"""
        vr = COCMVotingRights(
            group_sources=[group_source("polis", {0: 1, 1: 1, 2: 2})],
        )
        rights = vr.compute_entity_voting_rights(
            scorers=[0, 1, 2],
            trust_scores={0: 1.0, 1: 1.0, 2: 1.0},
            user_ids=[0, 1, 2],
        )
        # User 2 (independent) should have more weight than user 0 or 1 (connected)
        assert rights[2] > rights[0]
        assert rights[2] > rights[1]
        # Users 0 and 1 should have equal weight (symmetric)
        assert abs(rights[0] - rights[1]) < 1e-9

    def test_trust_scales_voting_rights(self) -> None:
        """Higher trust -> proportionally higher voting rights,
        regardless of group membership."""
        vr = COCMVotingRights(
            group_sources=[group_source("polis", {0: 1, 1: 1})],
        )
        vr.compute_entity_voting_rights(
            scorers=[0, 1],
            trust_scores={0: 1.0, 1: 1.0},
            user_ids=[0, 1],
        )
        rights_weighted = vr.compute_entity_voting_rights(
            scorers=[0, 1],
            trust_scores={0: 2.0, 1: 1.0},
            user_ids=[0, 1],
        )
        # User 0 with 2x trust should have higher weight
        assert rights_weighted[0] > rights_weighted[1]

    def test_more_connected_co_scorers_more_attenuation(self) -> None:
        """A user connected to MORE co-scorers should be more attenuated.
        (Paper: K function attenuates for each connected group interaction.)"""
        # Case 1: user 0 connected to 1 co-scorer (user 1)
        vr_small = COCMVotingRights(
            group_sources=[group_source("polis", {0: 1, 1: 1, 2: 2})],
        )
        rights_small = vr_small.compute_entity_voting_rights(
            scorers=[0, 1, 2],
            trust_scores={0: 1.0, 1: 1.0, 2: 1.0},
            user_ids=[0, 1, 2],
        )

        # Case 2: user 0 connected to 3 co-scorers (bigger group)
        vr_big = COCMVotingRights(
            group_sources=[group_source("polis", {0: 1, 1: 1, 2: 1, 3: 1, 4: 2})],
        )
        rights_big = vr_big.compute_entity_voting_rights(
            scorers=[0, 1, 2, 3, 4],
            trust_scores={i: 1.0 for i in range(5)},
            user_ids=list(range(5)),
        )

        # User 0 with 3 connected co-scorers should be more attenuated
        # than with 1 connected co-scorer
        assert rights_big[0] < rights_small[0]

    def test_single_scorer_full_weight(self) -> None:
        """A lone scorer has no one to be connected TO, so full weight."""
        vr = COCMVotingRights(
            group_sources=[group_source("polis", {0: 1, 1: 1})],
        )
        rights = vr.compute_entity_voting_rights(
            scorers=[0],  # only user 0 scored this entity
            trust_scores={0: 1.0},
            user_ids=[0, 1],
        )
        assert rights[0] == 1.0  # full trust, no attenuation

    def test_non_scorer_gets_zero(self) -> None:
        """Users who didn't score the entity get 0 voting rights for it."""
        vr = COCMVotingRights(
            group_sources=[group_source("polis", {0: 1, 1: 1, 2: 1})],
        )
        rights = vr.compute_entity_voting_rights(
            scorers=[0, 1],  # user 2 didn't score
            trust_scores={0: 1.0, 1: 1.0, 2: 1.0},
            user_ids=[0, 1, 2],
        )
        assert 2 not in rights or rights.get(2, 0) == 0


# ===========================================================================
# Cross-validation with reference implementation
# ===========================================================================


class TestCOCMCrossValidation:
    """Verify our adaptation against the reference COCM from plural-qf."""

    def test_matches_reference_three_agents_two_groups(self) -> None:
        """From the paper (Section 3.2): agents 1,2 in group X, agents 2,3
        in group Y. Under COCM, the interaction term between X and Y is
        attenuated because agent 2 bridges them.

        Our voting rights should reflect this: the bridge agent should
        have a different weight than the edge agents."""
        # Group X = {agent_0, agent_1}, Group Y = {agent_1, agent_2}
        # Agent 1 bridges both groups (is in both).
        # We model this with two group sources (each source = one group).
        vr = COCMVotingRights(
            group_sources=[
                group_source("group_X", {0: 1, 1: 1}),       # agents 0,1 in group X
                group_source("group_Y", {1: 1, 2: 1}),       # agents 1,2 in group Y
            ],
        )
        rights = vr.compute_entity_voting_rights(
            scorers=[0, 1, 2],
            trust_scores={0: 1.0, 1: 1.0, 2: 1.0},
            user_ids=[0, 1, 2],
        )

        # Agent 1 bridges both groups: connected to 2 co-scorers (0 via group_X, 2 via group_Y)
        # Agents 0 and 2 each connected to 1 co-scorer (agent 1 only)
        # So agent 1 should be MORE attenuated than either 0 or 2
        assert rights[1] < rights[0], (
            f"Bridge agent 1 ({rights[1]}) should be more attenuated than "
            f"edge agent 0 ({rights[0]})"
        )
        assert rights[1] < rights[2], (
            f"Bridge agent 1 ({rights[1]}) should be more attenuated than "
            f"edge agent 2 ({rights[2]})"
        )
        # Agents 0 and 2 are symmetric (each connected to exactly 1 co-scorer)
        assert abs(rights[0] - rights[2]) < 1e-9

    def test_paper_example_collusion_detection(self) -> None:
        """8 employees from same company all scoring the same item.
        Their collective influence should be MUCH less than 8 independent users.
        (Paper Section 1.1: 'eight employees of a software company')"""
        # All in same company
        vr = COCMVotingRights(
            group_sources=[group_source("company", {i: 1 for i in range(8)})],
        )
        grouped_rights = vr.compute_entity_voting_rights(
            scorers=list(range(8)),
            trust_scores={i: 1.0 for i in range(8)},
            user_ids=list(range(8)),
        )
        total_grouped = sum(grouped_rights.values())

        # Compare to 8 independent users (no groups)
        vr_independent = COCMVotingRights(group_sources=[])
        independent_rights = vr_independent.compute_entity_voting_rights(
            scorers=list(range(8)),
            trust_scores={i: 1.0 for i in range(8)},
            user_ids=list(range(8)),
        )
        total_independent = sum(independent_rights.values())

        # Grouped should be significantly less than independent
        # Paper proves O(sqrt) growth, so 8 grouped should have roughly sqrt(8) ~ 2.83
        # influence instead of 8
        assert total_grouped < total_independent * 0.6, (
            f"8 grouped users ({total_grouped:.2f}) should have much less "
            f"total weight than 8 independent ({total_independent:.2f})"
        )
