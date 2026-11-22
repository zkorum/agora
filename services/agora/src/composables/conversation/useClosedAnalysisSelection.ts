import type {
  ClosedAnalysisInputMode,
  ClosedAnalysisSelection,
} from "src/shared/types/dto";
import { useBackendCommentApi } from "src/utils/api/comment/comment";
import { useViewerQueryScope } from "src/utils/query/viewerScope";
import {
  computed,
  type MaybeRefOrGetter,
  onActivated,
  onDeactivated,
  onUnmounted,
  ref,
  toValue,
  watch,
} from "vue";

export function useClosedAnalysisSelection({
  slug,
  selection,
  canEdit,
  refresh,
}: {
  slug: MaybeRefOrGetter<string | undefined>;
  selection: MaybeRefOrGetter<ClosedAnalysisSelection | undefined>;
  canEdit: MaybeRefOrGetter<boolean>;
  refresh: (conversationSlugId: string) => Promise<void>;
}) {
  const api = useBackendCommentApi();
  const viewer = useViewerQueryScope();
  const active = ref(true);
  onActivated(() => {
    active.value = true;
  });
  function deactivate() {
    active.value = false;
  }
  onDeactivated(deactivate);
  onUnmounted(deactivate);
  const saving = ref(false);
  const failure = ref<{ closeId: number; selectionRevision: number }>();
  const saveFailed = computed(() => {
    const current = toValue(selection);
    return (
      current !== undefined &&
      failure.value?.closeId === current.closeId &&
      failure.value.selectionRevision === current.selectionRevision
    );
  });
  const canSwitch = computed(
    () => toValue(canEdit) && toValue(selection)?.isSwitchable === true
  );
  let scopeVersion = 0;
  watch(
    [
      active,
      () => viewer.value.userId,
      () => toValue(slug),
      () => toValue(selection)?.closeId,
      canSwitch,
    ],
    () => {
      scopeVersion++;
      saving.value = false;
      failure.value = undefined;
    },
    { flush: "sync" }
  );

  async function selectMode(inputMode: ClosedAnalysisInputMode): Promise<void> {
    const conversationSlugId = toValue(slug);
    const current = toValue(selection);
    if (
      conversationSlugId === undefined ||
      !active.value ||
      current === undefined ||
      !canSwitch.value ||
      saving.value
    )
      return;
    const { closeId, selectionRevision } = current;
    if (viewer.value.userId === undefined) return;
    const version = scopeVersion;
    const isCurrent = () => active.value && version === scopeVersion;
    saving.value = true;
    failure.value = undefined;
    try {
      await api.setClosedAnalysisInputMode({
        request: { conversationSlugId, closeId, selectionRevision, inputMode },
        isCurrent,
      });
    } catch {
      if (isCurrent()) failure.value = { closeId, selectionRevision };
    } finally {
      try {
        if (isCurrent()) await refresh(conversationSlugId);
      } finally {
        if (isCurrent()) saving.value = false;
      }
    }
  }
  return { canSwitch, saving, saveFailed, selectMode };
}
