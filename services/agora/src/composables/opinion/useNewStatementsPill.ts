import type { UseQueryReturnType } from "@tanstack/vue-query";
import type { OpinionItem } from "src/shared/types/zod";
import type { CommentFilterOptions } from "src/utils/component/opinion";
import {
  computed,
  type ComputedRef,
  type MaybeRefOrGetter,
  onDeactivated,
  type Ref,
  ref,
  toValue,
  watch,
} from "vue";

const TOP_COMMENT_COUNT = 3;
const filtersAffectedByNewOpinions = new Set<CommentFilterOptions>([
  "new",
  "discover",
]);

interface UseNewStatementsPillParams {
  postSlugId: MaybeRefOrGetter<string>;
  currentFilter: Ref<CommentFilterOptions>;
  currentOpinionData: ComputedRef<OpinionItem[]>;
  activeQuery: ComputedRef<UseQueryReturnType<OpinionItem[], Error>>;
  isCommentTabActive: Ref<boolean>;
  newOpinionSignalVersion: ComputedRef<number>;
  fetchCommentsForFilter: (params: {
    filter: CommentFilterOptions;
  }) => Promise<OpinionItem[]>;
  scrollToNewStatements: () => void;
}

export function useNewStatementsPill({
  postSlugId,
  currentFilter,
  currentOpinionData,
  activeQuery,
  isCommentTabActive,
  newOpinionSignalVersion,
  fetchCommentsForFilter,
  scrollToNewStatements,
}: UseNewStatementsPillParams) {
  const isPillVisible = ref(false);
  const acknowledgedTopOpinionSlugIds = ref<string[] | undefined>();
  const latestDetectedTopOpinionSlugIds = ref<string[] | undefined>();
  let previewRequestId = 0;
  let isPreviewFetchInFlight = false;

  const shouldShowNewStatementsPill = computed(
    () =>
      isCommentTabActive.value &&
      isPillVisible.value &&
      filtersAffectedByNewOpinions.has(currentFilter.value)
  );

  function getTopOpinionSlugIds({ opinions }: { opinions: OpinionItem[] }): string[] {
    return opinions
      .slice(0, TOP_COMMENT_COUNT)
      .map((opinion) => opinion.opinionSlugId);
  }

  function hasNewTopOpinion({
    nextTopOpinionSlugIds,
    acknowledgedOpinionSlugIds,
  }: {
    nextTopOpinionSlugIds: string[];
    acknowledgedOpinionSlugIds: string[];
  }): boolean {
    if (nextTopOpinionSlugIds.length === 0) {
      return false;
    }

    const acknowledgedOpinionSlugIdSet = new Set(acknowledgedOpinionSlugIds);
    return nextTopOpinionSlugIds.some(
      (opinionSlugId) => !acknowledgedOpinionSlugIdSet.has(opinionSlugId)
    );
  }

  function requestPillDisplay(): void {
    isPillVisible.value = true;
  }

  function acknowledgeOpinions({ opinions }: { opinions: OpinionItem[] }): void {
    acknowledgedTopOpinionSlugIds.value = getTopOpinionSlugIds({ opinions });
    latestDetectedTopOpinionSlugIds.value = undefined;
    isPillVisible.value = false;
  }

  function acknowledgeCurrentData(): void {
    const data = activeQuery.value.data.value;
    if (data !== undefined) {
      acknowledgeOpinions({ opinions: data });
      return;
    }

    acknowledgedTopOpinionSlugIds.value = undefined;
    latestDetectedTopOpinionSlugIds.value = undefined;
    isPillVisible.value = false;
  }

  function resetForCurrentView(): void {
    previewRequestId += 1;
    acknowledgeCurrentData();
  }

  async function checkForNewStatements(): Promise<void> {
    const filter = currentFilter.value;
    if (
      !isCommentTabActive.value ||
      !filtersAffectedByNewOpinions.has(filter) ||
      activeQuery.value.data.value === undefined ||
      isPreviewFetchInFlight
    ) {
      return;
    }

    const conversationSlugId = toValue(postSlugId);
    const requestId = previewRequestId + 1;
    previewRequestId = requestId;
    isPreviewFetchInFlight = true;
    let previewOpinions: OpinionItem[];
    try {
      previewOpinions = await fetchCommentsForFilter({ filter });
    } catch {
      isPreviewFetchInFlight = false;
      return;
    }
    isPreviewFetchInFlight = false;

    const isStillCurrentRequest =
      requestId === previewRequestId &&
      isCommentTabActive.value &&
      toValue(postSlugId) === conversationSlugId &&
      currentFilter.value === filter;
    if (!isStillCurrentRequest) {
      return;
    }

    const acknowledgedTopOpinionSlugIdsForFilter =
      acknowledgedTopOpinionSlugIds.value ??
      getTopOpinionSlugIds({ opinions: currentOpinionData.value });
    if (acknowledgedTopOpinionSlugIds.value === undefined) {
      acknowledgedTopOpinionSlugIds.value = acknowledgedTopOpinionSlugIdsForFilter;
    }

    const previewTopOpinionSlugIds = getTopOpinionSlugIds({
      opinions: previewOpinions,
    });
    if (
      hasNewTopOpinion({
        nextTopOpinionSlugIds: previewTopOpinionSlugIds,
        acknowledgedOpinionSlugIds: acknowledgedTopOpinionSlugIdsForFilter,
      })
    ) {
      latestDetectedTopOpinionSlugIds.value = previewTopOpinionSlugIds;
      requestPillDisplay();
    }
  }

  async function showNewStatements(): Promise<void> {
    isPillVisible.value = false;
    scrollToNewStatements();

    const result = await activeQuery.value.refetch();
    if (result.data !== undefined) {
      acknowledgeOpinions({ opinions: result.data });
    }
  }

  function dismissNewStatementsPill(): void {
    isPillVisible.value = false;
    const detectedTopOpinionSlugIds = latestDetectedTopOpinionSlugIds.value;
    if (detectedTopOpinionSlugIds !== undefined) {
      acknowledgedTopOpinionSlugIds.value = detectedTopOpinionSlugIds;
    }
  }

  async function refetchActiveQueryAndAcknowledge(): Promise<void> {
    const result = await activeQuery.value.refetch();
    if (result.data !== undefined) {
      acknowledgeOpinions({ opinions: result.data });
    }
  }

  watch(newOpinionSignalVersion, (nextVersion, previousVersion) => {
    if (nextVersion === previousVersion || nextVersion === 0) {
      return;
    }

    void checkForNewStatements();
  });

  watch(
    () => [toValue(postSlugId), currentFilter.value],
    () => resetForCurrentView()
  );

  watch(
    () => activeQuery.value.data.value,
    (data) => {
      if (
        data !== undefined &&
        acknowledgedTopOpinionSlugIds.value === undefined &&
        !isPillVisible.value
      ) {
        acknowledgeOpinions({ opinions: data });
      }
    },
    { immediate: true }
  );

  onDeactivated(() => {
    isPillVisible.value = false;
  });

  return {
    shouldShowNewStatementsPill,
    showNewStatements,
    dismissNewStatementsPill,
    acknowledgeCurrentData,
    resetForCurrentView,
    refetchActiveQueryAndAcknowledge,
  };
}
