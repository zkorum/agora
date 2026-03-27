"""Entity ID mapping between string slugIds (Agora) and int IDs (Solidago).

Solidago expects integer entity IDs for DataFrame indices and internal
coordinate mapping. This module provides a bidirectional mapper that
converts at the python-bridge boundary, keeping the int-mapping concern
contained in one place.
"""

from dataclasses import dataclass

from bws_conversion import PairwiseWin


# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class SolidagoEntityScore:
    """A scored entity with string slugId (mapped back from Solidago's int ID)."""

    entity_id: str
    score: float
    uncertainty_left: float
    uncertainty_right: float


# ---------------------------------------------------------------------------
# Mapper
# ---------------------------------------------------------------------------


class EntityIdMapper:
    """Bidirectional mapping between string slugIds and sequential ints.

    Int assignment follows the order of entity_ids (first → 0, second → 1, etc.).
    Duplicates in the input are silently deduplicated (first occurrence wins).
    """

    def __init__(self, *, entity_ids: list[str]) -> None:
        # Deduplicate while preserving order
        seen: set[str] = set()
        unique: list[str] = []
        for eid in entity_ids:
            if eid not in seen:
                seen.add(eid)
                unique.append(eid)

        self._str_to_int: dict[str, int] = {eid: i for i, eid in enumerate(unique)}
        self._int_to_str: dict[int, str] = {i: eid for i, eid in enumerate(unique)}

    @property
    def size(self) -> int:
        return len(self._str_to_int)

    def to_int(self, slug_id: str) -> int:
        """Map a string slugId to its integer ID. Raises KeyError if unknown."""
        return self._str_to_int[slug_id]

    def to_str(self, int_id: int) -> str:
        """Map an integer ID back to its string slugId. Raises KeyError if unknown."""
        if int_id < 0:
            raise KeyError(int_id)
        return self._int_to_str[int_id]

    def all_int_ids(self) -> list[int]:
        """Return all integer IDs in order."""
        return list(range(self.size))

    def all_str_ids(self) -> list[str]:
        """Return all string slugIds in order."""
        return [self._int_to_str[i] for i in range(self.size)]


# ---------------------------------------------------------------------------
# Mapping functions
# ---------------------------------------------------------------------------


def map_pairwise_wins_to_solidago(
    *,
    wins: list[PairwiseWin],
    mapper: EntityIdMapper,
) -> list[dict[str, int | float]]:
    """Convert PairwiseWin list to Solidago comparison format (int entity IDs).

    Each win becomes a row: {user_id, entity_a (winner), entity_b (loser),
    comparison=1.0, comparison_max=1.0}.

    Raises KeyError if a win references an entity not in the mapper.
    """
    # Solidago convention: comparison < 0 means entity_a is preferred.
    # So winner → entity_a with comparison=-1.0.
    return [
        {
            "user_id": win.user_id,
            "entity_a": mapper.to_int(win.winner),
            "entity_b": mapper.to_int(win.loser),
            "comparison": -1.0,
            "comparison_max": 1.0,
        }
        for win in wins
    ]


def map_scores_from_solidago(
    *,
    solidago_scores: list[tuple[int, tuple[float, float, float]]],
    mapper: EntityIdMapper,
) -> list[SolidagoEntityScore]:
    """Convert Solidago's int-keyed scores back to string-keyed SolidagoEntityScore.

    Parameters
    ----------
    solidago_scores : list of (int_entity_id, (score, left_unc, right_unc))
        As yielded by ScoringModel.iter_entities()
    mapper : EntityIdMapper for int→string conversion
    """
    return [
        SolidagoEntityScore(
            entity_id=mapper.to_str(int_id),
            score=score,
            uncertainty_left=left_unc,
            uncertainty_right=right_unc,
        )
        for int_id, (score, left_unc, right_unc) in solidago_scores
    ]
