<template>
  <div v-if="canOpen || notice !== undefined" class="closed-withdrawal">
    <PrimeButton
      v-if="canOpen"
      :label="t('withdraw')"
      :loading="withdrawing"
      severity="danger"
      text
      @click="openConfirmation"
    />
    <p v-if="notice !== undefined" role="status">{{ t(notice) }}</p>
  </div>
  <ZKConfirmDialog
    v-model="showConfirmation"
    :title="t('title')"
    :message="t('message')"
    :actions="actions"
    @confirm="withdraw"
  />
</template>

<script setup lang="ts">
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import PrimeButton from "primevue/button";
import type { ConfirmDialogActions } from "src/components/ui-library/ZKConfirmDialog.types";
import ZKConfirmDialog from "src/components/ui-library/ZKConfirmDialog.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { Dto } from "src/shared/types/dto";
import { refreshClosedAnalysisSelection } from "src/utils/analysis/refreshClosedAnalysisSelection";
import { signalComparisonCloseRefresh } from "src/utils/api/comparison/comparisonCloseRefresh";
import { useBackendVoteApi } from "src/utils/api/vote";
import { getUserVotesQueryKey } from "src/utils/query/conversationQueryKeys";
import {
  isQueryForViewerScope,
  useViewerQueryScope,
} from "src/utils/query/viewerScope";
import {
  computed,
  onActivated,
  onDeactivated,
  onUnmounted,
  ref,
  watch,
} from "vue";
import type { z } from "zod";

import { closedVoteWithdrawalTranslations } from "./ClosedVoteWithdrawal.i18n";

const props = defineProps<{
  conversationSlugId: string;
  method: "polis" | "comparisons" | "qv";
}>();
const { t } = useComponentI18n(closedVoteWithdrawalTranslations);
const viewerScope = useViewerQueryScope();
const active = ref(true);
const api = useBackendVoteApi();
const queryClient = useQueryClient();
const queryKey = computed(
  () =>
    [
      "closed-vote-withdrawal",
      props.conversationSlugId,
      viewerScope.value,
    ] as const
);
const status = useQuery({
  queryKey,
  enabled: computed(
    () => active.value && viewerScope.value.userId !== undefined
  ),
  queryFn: async ({ queryKey, signal }) =>
    await api.getClosedVoteWithdrawalStatus({
      conversationSlugId: queryKey[1],
      signal,
    }),
  retry: false,
});
const canOpen = computed(
  () =>
    active.value &&
    viewerScope.value.userId !== undefined &&
    status.data.value?.available === true
);
const withdrawing = ref(false);
const confirmation = ref<z.infer<typeof Dto.closedVoteWithdrawalRequest>>();
const showConfirmation = computed({
  get: () => confirmation.value !== undefined,
  set: (open: boolean) => {
    if (!open) confirmation.value = undefined;
  },
});
const notice = ref<"success" | "failure">();
const actions = computed(
  () =>
    ({
      cancel: { label: t("cancel"), appearance: "secondary-outlined" },
      confirm: { label: t("withdraw"), appearance: "danger" },
    }) satisfies ConfirmDialogActions
);
let scopeVersion = 0;
watch(
  [
    () => viewerScope.value.userId,
    () => props.conversationSlugId,
    () => props.method,
  ],
  resetConfirmation,
  { flush: "sync" }
);
watch(
  () => status.data.value,
  (current) => {
    if (
      current?.available !== true ||
      current.closeEpoch !== confirmation.value?.closeEpoch
    )
      confirmation.value = undefined;
  }
);
onActivated(() => {
  active.value = true;
});
onDeactivated(deactivate);
onUnmounted(deactivate);

function deactivate(): void {
  active.value = false;
  resetConfirmation();
}

function resetConfirmation(): void {
  scopeVersion++;
  confirmation.value = undefined;
  notice.value = undefined;
  withdrawing.value = false;
}

function openConfirmation(): void {
  const userId = viewerScope.value.userId;
  const current = status.data.value;
  if (
    !active.value ||
    userId === undefined ||
    current?.available !== true ||
    withdrawing.value
  )
    return;
  confirmation.value = {
    conversationSlugId: props.conversationSlugId,
    closeEpoch: current.closeEpoch,
    expectedViewerId: userId,
  };
  notice.value = undefined;
}

async function withdraw(): Promise<void> {
  const request = confirmation.value;
  if (request === undefined || withdrawing.value) return;
  const { conversationSlugId, expectedViewerId } = request;
  const version = scopeVersion;
  const isCurrent = () =>
    active.value &&
    version === scopeVersion &&
    props.conversationSlugId === conversationSlugId &&
    viewerScope.value.userId === expectedViewerId;
  if (!isCurrent()) return;
  const statusKey = queryKey.value;
  const withdrawingViewer = viewerScope.value;
  const method = props.method;
  withdrawing.value = true;
  try {
    try {
      await api.withdrawClosedVotes({ request, isCurrent });
    } catch {
      if (isCurrent()) {
        notice.value = "failure";
        await status.refetch();
      }
      return;
    }
    if (isCurrent()) notice.value = "success";
    const privateLoad = (key: string) => ({
      queryKey: [key, conversationSlugId],
      predicate: ({ queryKey }: { queryKey: readonly unknown[] }) =>
        isQueryForViewerScope({ queryKey, viewerScope: withdrawingViewer }),
    });
    const refreshes = [refreshQueries([{ queryKey: statusKey, exact: true }])];
    if (method === "polis") {
      const userVotesKey = getUserVotesQueryKey({
        conversationSlugId,
        voterId: expectedViewerId,
      });
      refreshes.push(
        refreshQueries([
          { queryKey: userVotesKey },
          { queryKey: ["comments", conversationSlugId] },
          { queryKey: ["commentStats", conversationSlugId] },
        ]),
        refreshClosedAnalysisSelection({ queryClient, conversationSlugId })
      );
    } else if (method === "qv") {
      refreshes.push(
        refreshQueries([
          privateLoad("qv-load"),
          { queryKey: ["qv-results", conversationSlugId] },
        ])
      );
    } else {
      refreshes.push(refreshQueries([privateLoad("comparison-load")]));
      signalComparisonCloseRefresh({ queryClient, conversationSlugId });
    }
    await Promise.all(refreshes);
  } finally {
    if (isCurrent()) withdrawing.value = false;
  }
}

async function refreshQueries(
  filters: readonly NonNullable<
    Parameters<typeof queryClient.cancelQueries>[0]
  >[]
): Promise<void> {
  await Promise.all(filters.map((filter) => queryClient.cancelQueries(filter)));
  await Promise.all(
    filters.map((filter) => queryClient.invalidateQueries(filter))
  );
}
</script>

<style scoped>
.closed-withdrawal {
  padding-inline: 1rem;
}
</style>
