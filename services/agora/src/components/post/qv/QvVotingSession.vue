<template>
  <div class="qv-tab">
    <ErrorRetryBlock
      v-if="accessRevoked"
      :title="t('loadError')"
      :retry-label="t('retry')"
      @retry="itemsQuery.refetch()"
    />
    <PageLoadingSpinner
      v-else-if="itemsQuery.isPending.value && items === undefined"
    />
    <ErrorRetryBlock
      v-else-if="itemsQuery.isError.value && items === undefined"
      :title="t('loadError')"
      :retry-label="t('retry')"
      @retry="itemsQuery.refetch()"
    />
    <template v-else-if="items !== undefined">
      <p v-if="isClosed" class="notice" role="status">{{ t("closed") }}</p>
      <p v-else-if="isLocked" class="notice" role="status">{{ t("locked") }}</p>
      <p v-if="statementsChanged" class="notice" role="alert">
        {{ t("changed") }}
      </p>
      <p v-if="conflict" class="notice" role="alert">
        {{ t("responseConflict") }}
      </p>
      <p v-if="notice !== undefined" class="notice" role="status">
        {{ t(notice) }}
      </p>
      <ErrorRetryBlock
        v-if="itemsQuery.isError.value"
        :title="t('loadError')"
        :retry-label="t('retry')"
        compact
        @retry="itemsQuery.refetch()"
      />
      <p v-if="items.length === 0" class="notice">{{ t("empty") }}</p>
      <QvAllocationEditor
        v-else
        v-model="allocations"
        :conversation-slug-id="conversationSlugId"
        :items="items"
        :allow-opposition="allowOpposition"
        :disabled="
          isClosed ||
          isLocked ||
          statementsChanged ||
          itemsQuery.isError.value ||
          isLeaving ||
          sessionRefreshRequired ||
          ((isSaving || pending !== undefined) &&
            viewerScope.userId === undefined)
        "
        :response-actions="responseActions"
        @discard="showDiscardDialog = true"
        @save="submit('save')"
        @withdraw="showWithdrawDialog = true"
      />
    </template>
    <PrimeButton
      v-if="sessionRefreshRequired"
      :label="t('retry')"
      :loading="refreshingSession"
      @click="refreshSession"
    />
    <ZKConfirmDialog
      v-model="showWithdrawDialog"
      :title="t('withdrawTitle')"
      :message="t('withdrawMessage')"
      :actions="withdrawActions"
      @confirm="submit('withdraw')"
    />
    <ZKConfirmDialog
      v-model="showDiscardDialog"
      :title="t('discardTitle')"
      :message="t('discardMessage')"
      :actions="discardActions"
      @confirm="discard"
    />
    <ZKConfirmDialog
      v-model="showExitDialog"
      :title="t('discardTitle')"
      :message="
        t(pending !== undefined ? 'pendingLeaveMessage' : 'discardMessage')
      "
      :actions="discardActions"
      @confirm="discardAndLeave"
    />
  </div>
</template>

<script setup lang="ts">
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { isAxiosError } from "axios";
import { storeToRefs } from "pinia";
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import type { ConfirmDialogActions } from "src/components/ui-library/ZKConfirmDialog.types";
import ZKConfirmDialog from "src/components/ui-library/ZKConfirmDialog.vue";
import { useParticipationGate } from "src/composables/conversation/useParticipationGate";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useLanguageStore } from "src/stores/language";
import { useBackendAuthApi } from "src/utils/api/auth";
import { useQvApi } from "src/utils/api/post/qv";
import { useRouteGuard } from "src/utils/component/routing/routeGuard";
import { useViewerQueryScope } from "src/utils/query/viewerScope";
import { getSingleRouteParam } from "src/utils/router/params";
import {
  computed,
  onActivated,
  onDeactivated,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from "vue";
import { onBeforeRouteUpdate } from "vue-router";

import QvAllocationEditor from "./QvAllocationEditor.vue";
import { qvVotingTranslations } from "./QvVoting.i18n";
import type {
  QvConversationMetadata,
  QvResponseActions,
} from "./QvVoting.types";
import { useQvResponseState } from "./useQvResponseState";

const props = defineProps<{
  conversationMetadata: QvConversationMetadata;
}>();
const { t } = useComponentI18n(qvVotingTranslations);
const { displayLanguage, spokenLanguages } = storeToRefs(useLanguageStore());
const viewerScope = useViewerQueryScope();
const qvApi = useQvApi();
const queryClient = useQueryClient();
const { applyAcceptedParticipationAuth, refreshAuthState } =
  useBackendAuthApi();
const conversationSlugId = computed(
  () => props.conversationMetadata.conversationSlugId
);
const { captureParticipationAction } = useParticipationGate(conversationSlugId);
const state = useQvResponseState();
const {
  snapshot,
  baseline,
  allocations,
  pending,
  conflict,
  hasUnsavedChanges,
  statementsChanged,
} = state;
const items = computed(() => snapshot.value?.items);
const allowOpposition = computed(
  () =>
    snapshot.value?.allowOpposition ??
    props.conversationMetadata.allowOpposition
);
const isClosed = computed(
  () =>
    props.conversationMetadata.isClosed ||
    itemsQuery.data.value?.isClosed === true
);
const isLocked = computed(() => {
  const moderation = props.conversationMetadata.moderation;
  return moderation.status === "moderated" && moderation.action === "lock";
});
const isActive = ref(true);
const showDiscardDialog = ref(false);
const showWithdrawDialog = ref(false);
const isSaving = ref(false);
const sessionRefreshRequired = ref(false);
const refreshingSession = ref(false);
const commandAccessRevoked = ref(false);
const notice = ref<
  | "saved"
  | "withdrawn"
  | "saveError"
  | "commandUncertain"
  | "sessionRefreshError"
>();
let mounted = true;
onUnmounted(() => {
  mounted = false;
});
const isLeaving = ref(false);
const discardActions = computed(
  () =>
    ({
      cancel: { label: t("keepEditing"), appearance: "secondary-outlined" },
      confirm: { label: t("discard"), appearance: "danger" },
    }) satisfies ConfirmDialogActions
);
const withdrawActions = computed(
  () =>
    ({
      cancel: { label: t("keepEditing"), appearance: "secondary-outlined" },
      confirm: { label: t("withdraw"), appearance: "danger" },
    }) satisfies ConfirmDialogActions
);
const responseActions = computed(
  () =>
    ({
      dirty: hasUnsavedChanges.value,
      canSave:
        !isSaving.value &&
        !accessRevoked.value &&
        !sessionRefreshRequired.value &&
        !itemsQuery.isError.value &&
        (pending.value !== undefined ||
          (!isClosed.value &&
            !isLocked.value &&
            !conflict.value &&
            state.canSave.value)),
      canWithdraw:
        !isSaving.value &&
        !accessRevoked.value &&
        !sessionRefreshRequired.value &&
        pending.value === undefined &&
        !isClosed.value &&
        !isLocked.value &&
        !itemsQuery.isError.value &&
        !conflict.value,
      canDiscard: !isSaving.value && pending.value === undefined,
      saving: isSaving.value,
      retrying: pending.value !== undefined && !isSaving.value,
      hasSaved: baseline.value.saved !== undefined,
    }) satisfies QvResponseActions
);
const itemsQueryKey = computed(
  () =>
    [
      "qv-load",
      conversationSlugId.value,
      displayLanguage.value,
      [...spokenLanguages.value].sort(),
      props.conversationMetadata.qvGeneration ?? 0,
      viewerScope.value,
    ] as const
);
const itemsQuery = useQuery({
  enabled: isActive,
  queryKey: itemsQueryKey,
  queryFn: async ({ signal, queryKey }) =>
    await qvApi.load({ conversationSlugId: queryKey[1], signal }),
  refetchInterval: (query) =>
    query.state.data?.items.some(
      ({ displayContent }) =>
        displayContent.translationControl?.status === "pending" ||
        displayContent.translationControl?.status === "running"
    )
      ? 2000
      : false,
});

const accessRevoked = computed(() => {
  const error = itemsQuery.error.value;
  return (
    commandAccessRevoked.value ||
    (itemsQuery.data.value !== undefined &&
      itemsQuery.data.value.viewerId !== viewerScope.value.userId) ||
    (isAxiosError<unknown>(error) &&
      error.response !== undefined &&
      [401, 403, 404, 410].includes(error.response.status))
  );
});

watch(
  () => itemsQuery.data.value,
  (current) => {
    if (current === undefined) return;
    if (current.viewerId !== viewerScope.value.userId) {
      sessionRefreshRequired.value = true;
      void refreshSession();
      return;
    }
    state.receive(current);
  },
  { immediate: true }
);

function discard(): void {
  state.discard();
  if (!sessionRefreshRequired.value) notice.value = undefined;
}

async function submit(action: "save" | "withdraw"): Promise<void> {
  if (
    isSaving.value ||
    accessRevoked.value ||
    sessionRefreshRequired.value ||
    itemsQuery.isError.value ||
    (pending.value === undefined && (isClosed.value || isLocked.value))
  )
    return;
  const command = state.begin({
    action,
    conversationSlugId: conversationSlugId.value,
  });
  if (command === undefined) return;
  isSaving.value = true;
  notice.value = undefined;
  const participation = captureParticipationAction();
  const commandGeneration = props.conversationMetadata.qvGeneration ?? 0;
  const identity = viewerScope.value.userId;
  const isCurrent = () => mounted && viewerScope.value.userId === identity;
  try {
    let result: Awaited<ReturnType<typeof qvApi.save>>;
    try {
      result =
        command.action === "save"
          ? await qvApi.save({ request: command.request, isCurrent })
          : await qvApi.withdraw({ request: command.request, isCurrent });
    } catch (error) {
      if (!isCurrent()) return;
      const status = isAxiosError<unknown>(error)
        ? error.response?.status
        : undefined;
      if (
        status !== undefined &&
        [400, 401, 403, 404, 409, 410, 422].includes(status)
      ) {
        // These API failures reject before commit. Network/server failures may
        // instead hide an accepted command, whose exact payload must be retained.
        state.reject(status === 409 ? "identity_conflict" : "request_rejected");
        commandAccessRevoked.value = [401, 403, 404, 410].includes(status);
        notice.value = "saveError";
        if ([401, 403, 409].includes(status)) {
          sessionRefreshRequired.value = true;
          await refreshSession();
        }
        if (isCurrent()) await itemsQuery.refetch();
      } else notice.value = "commandUncertain";
      return;
    }
    if (!isCurrent()) return;
    if (!result.success) {
      state.reject(result.reason);
      notice.value = "saveError";
      if (result.reason === "identity_conflict") {
        sessionRefreshRequired.value = true;
        await refreshSession();
      }
      if ("participationStatus" in result)
        await participation.handleBlockedReason(result);
      if (isCurrent()) await itemsQuery.refetch();
      return;
    }
    state.accept(result.response);
    notice.value = conflict.value
      ? undefined
      : command.action === "save"
        ? "saved"
        : "withdrawn";
    // Stop a pre-save refresh from reintroducing the old private baseline.
    await queryClient.cancelQueries({
      queryKey: ["qv-load", conversationSlugId.value],
    });
    if (!isCurrent()) return;
    const acceptedSnapshot = snapshot.value;
    if (
      conflict.value ||
      commandGeneration !== (props.conversationMetadata.qvGeneration ?? 0) ||
      acceptedSnapshot?.isClosed !== props.conversationMetadata.isClosed
    )
      await itemsQuery.refetch();
    else if (acceptedSnapshot !== undefined) {
      const acceptedScope = {
        kind: "viewer",
        userId: result.loginStatus.userId,
      };
      queryClient.setQueryData(
        [...itemsQueryKey.value.slice(0, -1), acceptedScope],
        { ...acceptedSnapshot, viewerId: result.loginStatus.userId }
      );
    }
    await applyAcceptedParticipationAuth({
      loginStatus: result.loginStatus,
      didWrite: result.didWrite,
      isCurrent,
    });
  } catch {
    // The command has already settled; a cache/onboarding failure is not an
    // uncertain write and must not invite another Save.
    if (isCurrent()) {
      sessionRefreshRequired.value = true;
      notice.value = "sessionRefreshError";
    }
  } finally {
    if (mounted) isSaving.value = false;
  }
}

async function refreshSession(): Promise<void> {
  if (refreshingSession.value) return;
  refreshingSession.value = true;
  const identity = viewerScope.value.userId;
  try {
    // Explicit recovery still checks the backend; accepted writes carry their own identity.
    await refreshAuthState();
    if (!mounted || viewerScope.value.userId !== identity) return;
    const refreshed = await itemsQuery.refetch();
    if (!mounted || viewerScope.value.userId !== identity) return;
    const matchesViewer =
      refreshed.data !== undefined && refreshed.data.viewerId === identity;
    sessionRefreshRequired.value = refreshed.isError || !matchesViewer;
    commandAccessRevoked.value = sessionRefreshRequired.value;
    notice.value = sessionRefreshRequired.value
      ? "sessionRefreshError"
      : undefined;
  } catch {
    if (mounted) notice.value = "sessionRefreshError";
  } finally {
    refreshingSession.value = false;
  }
}

const {
  showExitDialog,
  lockRoute,
  unlockRoute,
  guardNavigation,
  proceedWithNavigation,
} = useRouteGuard(
  () =>
    isActive.value && (hasUnsavedChanges.value || pending.value !== undefined),
  () =>
    !isActive.value || (!hasUnsavedChanges.value && pending.value === undefined)
);
onMounted(lockRoute);
onActivated(() => {
  isActive.value = true;
  lockRoute();
});
onDeactivated(() => {
  isActive.value = false;
  unlockRoute();
});
onBeforeRouteUpdate((to, from) => {
  if (
    "postSlugId" in to.params &&
    getSingleRouteParam(to.params.postSlugId) === conversationSlugId.value
  )
    return true;
  return guardNavigation({ to, fromPath: from.fullPath });
});

async function discardAndLeave(): Promise<void> {
  isLeaving.value = true;
  try {
    await proceedWithNavigation(state.discardForNavigation);
  } finally {
    // A different guard may cancel navigation after ours has accepted it.
    if (isActive.value) lockRoute();
    isLeaving.value = false;
  }
}
</script>

<style scoped lang="scss">
.qv-tab {
  padding-block: 0.5rem 1.5rem;
}
.notice {
  padding: 1rem;
  margin-block: 0.5rem;
  border-radius: 8px;
  background: $app-background-color;
  color: $ink-light;
}
</style>
