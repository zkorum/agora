"""BWS (Best-Worst Scaling) to pairwise comparison conversion.

Ported from services/api/src/service/maxdiffEngine.ts.
Uses transitive closure to infer all pairwise orderings from BWS votes,
then extracts ordered pairs as pairwise wins.

Inspired by SeregPie/MaxDiff (MIT License):
https://github.com/SeregPie/MaxDiff
"""

from dataclasses import dataclass


# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class BWSComparison:
    """A single Best-Worst Scaling vote: pick best and worst from a candidate set."""

    user_id: int
    best: str
    worst: str
    candidate_set: list[str]


@dataclass(frozen=True)
class PairwiseWin:
    """A single pairwise ordering: winner beats loser."""

    user_id: int
    winner: str
    loser: str


# ---------------------------------------------------------------------------
# Bron-Kerbosch algorithm (maximal clique finding)
# ---------------------------------------------------------------------------


def bron_kerbosch(edges: list[tuple[str, str]]) -> list[list[str]]:
    """Find all maximal cliques in an undirected graph.

    Parameters
    ----------
    edges : list of (node_a, node_b) pairs

    Returns
    -------
    list of cliques, each clique is a list of node IDs
    """
    nodes: set[str] = set()
    for a, b in edges:
        nodes.add(a)
        nodes.add(b)

    if len(nodes) < 2:
        return []

    neighbors: dict[str, set[str]] = {node: set() for node in nodes}
    for a, b in edges:
        neighbors[a].add(b)
        neighbors[b].add(a)

    cliques: list[list[str]] = []

    def _find_cliques(
        clique: set[str],
        candidates: set[str],
        excluded: set[str],
    ) -> None:
        if not candidates and not excluded:
            cliques.append(list(clique))
            return

        # Pivot selection: choose node with most neighbors in candidates
        pivot_neighbors: set[str] = set()
        for node in candidates | excluded:
            node_neighbors = neighbors.get(node, set())
            intersection = node_neighbors & candidates
            if len(intersection) > len(pivot_neighbors):
                pivot_neighbors = intersection

        for candidate in candidates - pivot_neighbors:
            candidate_neighbors = neighbors.get(candidate, set())
            _find_cliques(
                clique | {candidate},
                candidates & candidate_neighbors,
                excluded & candidate_neighbors,
            )
            candidates = candidates - {candidate}
            excluded = excluded | {candidate}

    _find_cliques(set(), nodes, set())
    return cliques


# ---------------------------------------------------------------------------
# Comparison matrix with transitive closure
# ---------------------------------------------------------------------------


class ComparisonMatrix:
    """Tracks pairwise orderings between items with automatic transitive closure.

    The matrix stores: -1 (i before j), +1 (i after j), 0 (same), None (unknown).
    When a new ordering is added, transitive closure propagates it:
    if A>B and B>C, then A>C is inferred automatically.
    """

    def __init__(self, items: list[str]) -> None:
        self._items = list(items)
        self._n = len(items)
        self._index: dict[str, int] = {item: i for i, item in enumerate(items)}
        # None = unknown, 0 = same, -1 = i<j (i before j), +1 = i>j
        self._matrix: list[list[int | None]] = [
            [None] * self._n for _ in range(self._n)
        ]
        for i in range(self._n):
            self._matrix[i][i] = 0

    def _idx(self, item: str) -> int:
        return self._index.get(item, -1)

    def _get(self, a: str, b: str) -> int | None:
        i, j = self._idx(a), self._idx(b)
        if i < 0 or j < 0:
            return None
        return self._matrix[i][j]

    def _set_order(self, before: str, after: str) -> None:
        i, j = self._idx(before), self._idx(after)
        if i < 0 or j < 0:
            return
        self._matrix[i][j] = -1
        self._matrix[j][i] = 1

    def _items_before(self, item: str) -> list[str]:
        """Items known to come before (be better than) the given item."""
        return [
            other
            for other in self._items
            if (c := self._get(other, item)) is not None and c < 0
        ]

    def _items_after(self, item: str) -> list[str]:
        """Items known to come after (be worse than) the given item."""
        return [
            other
            for other in self._items
            if (c := self._get(other, item)) is not None and c > 0
        ]

    def _order(self, item_before: str, item_after: str) -> None:
        """Record that item_before > item_after, with transitive closure."""
        if self._get(item_before, item_after) is not None:
            return  # already known
        self._set_order(item_before, item_after)
        # Transitive closure
        before_items = self._items_before(item_before)
        after_items = self._items_after(item_after)
        for b in before_items:
            self._set_order(b, item_after)
        for a in after_items:
            self._set_order(item_before, a)
        for b in before_items:
            for a in after_items:
                self._set_order(b, a)

    def apply_comparison(self, comparison: BWSComparison) -> None:
        """Apply a BWS comparison: best beats everyone, everyone beats worst."""
        item_set = set(self._items)
        candidate_set = [c for c in comparison.candidate_set if c in item_set]
        if comparison.best not in item_set or comparison.worst not in item_set:
            return

        # Best beats everyone else in the set
        for other in candidate_set:
            if other != comparison.best:
                self._order(comparison.best, other)

        # Everyone else beats worst
        for other in candidate_set:
            if other != comparison.worst and other != comparison.best:
                self._order(other, comparison.worst)

    def get_ordered_pairs(self) -> list[tuple[str, str]]:
        """Return all pairs where ordering is known: (winner, loser)."""
        pairs: list[tuple[str, str]] = []
        for i in range(self._n):
            for j in range(i + 1, self._n):
                c = self._matrix[i][j]
                if c is None or c == 0:
                    continue
                if c < 0:
                    pairs.append((self._items[i], self._items[j]))
                else:
                    pairs.append((self._items[j], self._items[i]))
        return pairs

    def get_unordered_pairs(self) -> list[tuple[str, str]]:
        """Return all pairs where ordering is unknown."""
        pairs: list[tuple[str, str]] = []
        for i in range(self._n):
            for j in range(i + 1, self._n):
                if self._matrix[i][j] is None:
                    pairs.append((self._items[i], self._items[j]))
        return pairs


def build_comparison_matrix(*, items: list[str]) -> ComparisonMatrix:
    """Create a new comparison matrix for the given items."""
    return ComparisonMatrix(items)


# ---------------------------------------------------------------------------
# Main conversion function
# ---------------------------------------------------------------------------


def bws_to_pairwise(
    *,
    bws_comparisons: list[BWSComparison],
    entity_ids: list[str],
) -> list[PairwiseWin]:
    """Convert BWS comparisons to pairwise wins via transitive closure.

    For each user, applies transitive closure to all their BWS votes,
    then extracts all resolved pairwise orderings as PairwiseWin objects.

    Parameters
    ----------
    bws_comparisons : list of BWS votes (may contain multiple users)
    entity_ids : list of active entity IDs (comparisons referencing
        other entities are filtered out)

    Returns
    -------
    list of PairwiseWin (winner beats loser), one per resolved pair per user
    """
    if not entity_ids or not bws_comparisons:
        return []

    # Group comparisons by user
    comparisons_by_user: dict[int, list[BWSComparison]] = {}
    for comp in bws_comparisons:
        comparisons_by_user.setdefault(comp.user_id, []).append(comp)

    result: list[PairwiseWin] = []

    for user_id, user_comparisons in comparisons_by_user.items():
        matrix = ComparisonMatrix(entity_ids)
        for comp in user_comparisons:
            matrix.apply_comparison(comp)

        for winner, loser in matrix.get_ordered_pairs():
            result.append(PairwiseWin(
                user_id=user_id,
                winner=winner,
                loser=loser,
            ))

    return result
