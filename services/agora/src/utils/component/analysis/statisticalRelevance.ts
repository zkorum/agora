import { computed, type ComputedRef, type Ref, ref } from "vue";

/**
 * Display threshold for analysis tabs.
 *
 * The backend ranks items using participation-dampened scoring:
 *   weighted_score = raw_score × totalVotes / GREATEST(totalVotes + participantCount × 0.1, 1)
 * (see services/api/src/utils/sqlLogic.ts — participationWeight)
 *
 * Items below an absolute minimum score (`minScore`) are excluded.
 * This ensures tabs can be empty when no item has a strong enough signal
 * (e.g., no genuine cross-group disagreement exists).
 *
 * For consensus tabs, the geometric mean scores from reddwarf have clear
 * semantic meaning: >0.5 = more likely than not genuine cross-group consensus.
 * A minScore of 0.6 filters out borderline items while showing all genuinely
 * strong consensus statements up to MAX_COUNT.
 */

const MAX_COUNT = 15;

const COMPACT_COUNT = 3;

/**
 * Composable for analysis tab display logic with score-based threshold.
 * Encapsulates the shared pattern: qualifiedItems → displayedItems,
 * plus load-more state management.
 *
 * @param minScore — absolute minimum raw score. Items below this are excluded
 *   from default display (but revealed when the user clicks "Load More").
 *   For consensus probabilities (0-1), use 0.6 (strong cross-group signal).
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
    Math.min(qualifiedItems.value.length, MAX_COUNT)
  );

  // Items above the score threshold — shown by default
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
