<template>
  <PageLoadingSpinner v-if="state.kind === 'loading'" />
  <ErrorRetryBlock
    v-else-if="state.kind === 'error'"
    :title="t('previewError')"
    :retry-label="tWorkspace('retry')"
    @retry="load"
  />
  <template v-else-if="state.kind === 'ready'">
    <ZKInfoBanner
      v-if="state.response.reconstructed"
      :message="t('reconstructed')"
    />
    <ConversationEmailViewer
      :email="state.response.preview"
      :language="language"
      :title="state.response.preview.subject"
    />
  </template>
</template>

<script setup lang="ts">
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import ZKInfoBanner from "src/components/ui-library/ZKInfoBanner.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import type { Dto } from "src/shared/types/dto";
import { useBackendConversationEmailUpdatesApi } from "src/utils/api/conversationUpdates/conversationEmailUpdates";
import { onBeforeUnmount, shallowRef, watch } from "vue";

import ConversationEmailViewer from "./ConversationEmailViewer.vue";
import { conversationUpdateReviewTranslations } from "./ConversationUpdateReview.i18n";
import { conversationUpdatesWorkspaceTranslations } from "./ConversationUpdatesWorkspace.i18n";

const props = defineProps<{
  updateId: string;
  language: SupportedDisplayLanguageCodes;
}>();
const api = useBackendConversationEmailUpdatesApi();
const { t } = useComponentI18n(conversationUpdateReviewTranslations);
const { t: tWorkspace } = useComponentI18n(
  conversationUpdatesWorkspaceTranslations
);
type Response = Extract<
  ReturnType<typeof Dto.conversationEmailUpdatePreviewResponse.parse>,
  { success: true }
>;
const state = shallowRef<
  { kind: "loading" | "error" } | { kind: "ready"; response: Response }
>({ kind: "loading" });
let generation = 0;
async function load(): Promise<void> {
  const token = ++generation;
  state.value = { kind: "loading" };
  try {
    const response = await api.getHistoryPreview({
      updateId: props.updateId,
      language: props.language,
    });
    if (token !== generation) return;
    state.value = response.success
      ? { kind: "ready", response }
      : { kind: "error" };
  } catch (cause) {
    if (token !== generation) return;
    console.error("Failed to load Email Update history preview", cause);
    state.value = { kind: "error" };
  }
}
watch(() => [props.updateId, props.language], load, { immediate: true });
onBeforeUnmount(() => {
  generation += 1;
});
</script>
