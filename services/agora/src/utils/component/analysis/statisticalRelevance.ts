import { computed, type ComputedRef, type Ref, ref } from "vue";

/**
 * Gap-based display threshold for analysis tabs.
 *
 * The backend ranks items using participation-dampened scoring:
 *   weighted_score = raw_score × totalVotes / GREATEST(totalVotes + participantCount × 0.1, 1)
 * (see services/api/src/utils/sqlLogic.ts — participationWeight)
 *
 * The frontend uses **gap detection** on the raw scores to find the natural cutoff.
 * We deliberately do NOT re-apply participation dampening here — the backend already
 * handles ranking quality. Applying the same dampening again ("double dampening")
 * creates an artificial cliff between well-voted and poorly-voted items.
 *
 * Additionally, items below an absolute minimum score (`minScore`) are excluded before
 * gap detection. This ensures tabs can be empty when no item has a strong enough signal
 * (e.g., no genuine cross-group disagreement exists).
 *
 * ## Why gap detection?
 *
 * A fixed count cap (e.g., "always show 10") doesn't adapt to the data.
 * A percentage threshold (e.g., "show items above 20% of max") requires an arbitrary
 * tuning parameter. Gap detection is self-calibrating: it finds natural breaks in the
 * score distribution where meaningful items end and noise begins.
 *
 * References:
 * - Meilisearch dynamic thresholding: https://github.com/orgs/meilisearch/discussions/788
 * - "Where to Stop Reading a Ranked List?" (Arampatzis & Robertson, SIGIR 2009)
 *
 * ## The algorithm
 *
 * 1. Filter items below minScore (absolute quality bar)
 * 2. Extract raw scores for remaining items (in backend-sorted order)
 * 3. Compute consecutive gaps: gap[i] = score[i] - score[i+1]
 * 4. Find the first gap > GAP_SIGNIFICANCE × mean_positive_gap
 * 5. Show items up to that position, bounded by MAX_COUNT
 *
 * Note: Raw scores won't be monotonically decreasing (backend sorts by dampened score,
 * not raw score). Negative gaps (score increases) are filtered out — only downward drops
 * are considered significant.
 */

const MAX_COUNT = 15;
const GAP_SIGNIFICANCE = 2.0;

/**
 * Computes how many items to display by default using gap detection.
 * Items are expected in backend-ranked order (highest weighted score first).
 * Uses raw scores (not participation-dampened) because the backend already
 * applies participation dampening in its ORDER BY.
 */
function computeDefaultDisplayCount<T>({
  items,
  getRawScore,
}: {
  items: T[];
  getRawScore: (item: T) => number;
}): number {
  if (items.length === 0) return 0;

  const scores = items.map((item) => getRawScore(item));

  // Compute consecutive gaps
  const gaps: number[] = [];
  for (let i = 0; i < scores.length - 1; i++) {
    gaps.push(scores[i] - scores[i + 1]);
  }

  // Mean of non-zero gaps (zero gaps mean identical scores — not informative)
  const nonZeroGaps = gaps.filter((g) => g > 0);
  if (nonZeroGaps.length === 0) return Math.min(items.length, MAX_COUNT);
  const meanGap =
    nonZeroGaps.reduce((a, b) => a + b, 0) / nonZeroGaps.length;

  // Find first significant gap
  for (let i = 0; i < gaps.length; i++) {
    if (gaps[i] > meanGap * GAP_SIGNIFICANCE) {
      return i + 1;
    }
  }

  // No significant gap → show up to MAX_COUNT
  return Math.min(items.length, MAX_COUNT);
}

const COMPACT_COUNT = 3;

/**
 * Composable for analysis tab display logic with gap-based smart threshold.
 * Encapsulates the shared pattern: qualifiedItems → defaultCount → displayedItems,
 * plus load-more state management.
 *
 * @param minScore — absolute minimum raw score. Items below this are excluded
 *   from default display (but revealed when the user clicks "Load More").
 *   For consensus probabilities (0-1), use 0.5 ("more likely than not").
 */
export function useAnalysisDisplayList<T>({
  items,
  compactMode,
  getRawScore,
  minScore = 0,
}: {
  items: ComputedRef<T[]> | Ref<T[]>;
  compactMode: ComputedRef<boolean> | Ref<boolean>;
  getRawScore: (item: T) => number;
  minScore?: number;
}) {
  const showLoadMoreWarning = ref(false);
  const hasLoadedMore = ref(false);

  // Items that meet the absolute quality bar
  const qualifiedItems = computed(() =>
    items.value.filter((item) => getRawScore(item) >= minScore)
  );

  const defaultCount = computed(() =>
    computeDefaultDisplayCount({
      items: qualifiedItems.value,
      getRawScore,
    })
  );

  // Items within the gap-detection cutoff — shown by default
  const representativeItems = computed(() => {
    const count = compactMode.value
      ? Math.min(COMPACT_COUNT, defaultCount.value)
      : defaultCount.value;
    return qualifiedItems.value.slice(0, count);
  });

  // Items beyond the cutoff — only shown after "Load more"
  const additionalItems = computed(() => {
    if (!hasLoadedMore.value || compactMode.value) return [];
    const repSet = new Set(representativeItems.value);
    return items.value.filter((item) => !repSet.has(item));
  });

  const remainingCount = computed(() => {
    const totalDisplayed =
      representativeItems.value.length + additionalItems.value.length;
    return Math.max(0, items.value.length - totalDisplayed);
  });

  function handleLoadMore() {
    showLoadMoreWarning.value = true;
  }

  return {
    representativeItems,
    additionalItems,
    remainingCount,
    showLoadMoreWarning,
    hasLoadedMore,
    handleLoadMore,
  };
}
