<template>
  <q-btn
    flat
    no-caps
    :label="filters('moderationHistory')"
    @click="historyOpen = true"
  />
  <q-dialog v-model="historyOpen" position="bottom">
    <ZKBottomDialogContainer
      :title="filters('moderationHistory')"
      :show-close-button="true"
    >
      <p>{{ filters("moderationHistoryDescription") }}</p>
      <p v-if="rows.length">{{ t("original") }}</p>
      <div v-for="row in rows" :key="row.id" class="q-mb-md">
        <strong>{{ t(row.action === "move" ? "moved" : "hidden") }}</strong>
        <ZKHtmlContent
          dir="auto"
          content-role="title"
          class="block"
          :html-body="row.title"
          :compact-mode="false"
          :enable-links="false"
        />
        <ZKHtmlContent
          v-if="row.body"
          dir="auto"
          :html-body="row.body"
          :compact-mode="false"
          :enable-links="false"
        />
        <p dir="auto">{{ row.reason }}</p>
        <q-btn
          v-if="canModerate && (row.action !== 'hide' || siteModerator)"
          flat
          :label="t('restore')"
          @click="beginRestore(row.itemSlugId)"
        />
        <q-btn
          v-if="siteModerator && row.action === 'move'"
          flat
          :label="actions('hide')"
          @click="beginHide(row.itemSlugId)"
        />
      </div>
      <q-spinner v-if="loading" />
      <q-btn
        v-else-if="readFailed || cursor !== undefined"
        flat
        :label="readFailed ? t('retry') : t('more')"
        @click="loadHistory()"
      />
      <p v-else-if="!rows.length">{{ t("empty") }}</p>
    </ZKBottomDialogContainer>
  </q-dialog>
  <q-dialog
    :model-value="target !== undefined"
    position="bottom"
    @update:model-value="closeAction"
  >
    <ZKBottomDialogContainer :title="t('moderate')" :show-close-button="true">
      <p v-if="action !== 'restore'">{{ t("visibility") }}</p>
      <q-input
        :model-value="reason"
        :label="t('reason')"
        maxlength="1000"
        autogrow
        @update:model-value="
          (value) => (reason = typeof value === 'string' ? value : '')
        "
      />
      <p v-if="writeFailed" role="alert">{{ t("error") }}</p>
      <q-btn
        v-if="canModerate && action === 'choose'"
        flat
        :disable="disabled"
        :label="actions('move')"
        @click="save('move')"
      />
      <q-btn
        v-if="siteModerator && action !== 'restore'"
        flat
        :disable="disabled"
        :label="actions('hide')"
        @click="save('hide')"
      />
      <q-btn
        v-if="canModerate && action === 'restore'"
        flat
        :disable="disabled"
        :label="t('restore')"
        @click="save('restore')"
      />
    </ZKBottomDialogContainer>
  </q-dialog>
</template>

<script setup lang="ts">
import { commentSortingSelectorTranslations } from "src/components/post/comments/group/CommentSortingSelector.i18n";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import ZKHtmlContent from "src/components/ui-library/ZKHtmlContent.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { Dto } from "src/shared/types/dto";
import { useOpinionRedactionStore } from "src/stores/opinionRedaction";
import { useComparisonApi } from "src/utils/api/comparison/comparison";
import { moderationsTranslations } from "src/utils/component/moderations.i18n";
import { useViewerQueryScope } from "src/utils/query/viewerScope";
import { computed, onDeactivated, onUnmounted, ref, watch } from "vue";
import type { z } from "zod";

import { comparisonModerationTranslations } from "./ComparisonModeration.i18n";

const props = defineProps<{
  conversationSlugId: string;
  canModerate: boolean;
  siteModerator: boolean;
}>();
const emit = defineEmits<{ changed: [] }>();
const target = defineModel<string | undefined>("target", { required: true });
const { t } = useComponentI18n(comparisonModerationTranslations);
const { t: filters } = useComponentI18n(commentSortingSelectorTranslations);
const { t: actions } = useComponentI18n(moderationsTranslations);
const { moderationHistory, moderateItem } = useComparisonApi();
const viewer = useViewerQueryScope();
const redaction = useOpinionRedactionStore();
const historyOpen = ref(false);
const rows = ref<
  z.infer<typeof Dto.comparisonModerationHistoryResponse>["items"]
>([]);
const cursor = ref<number>();
const reason = ref("");
const action = ref<"choose" | "hide" | "restore">("choose");
const loading = ref(false),
  saving = ref(false),
  readFailed = ref(false),
  writeFailed = ref(false);
const disabled = computed(() => saving.value || !reason.value.trim());
let reader: AbortController | undefined, writer: AbortController | undefined;
function closeAction() {
  target.value = undefined;
}
function beginRestore(id: string) {
  action.value = "restore";
  target.value = id;
}
function beginHide(id: string) {
  action.value = "hide";
  target.value = id;
}
function clearHistory() {
  reader?.abort();
  rows.value = [];
  cursor.value = undefined;
  loading.value = false;
  readFailed.value = false;
}
function clearAll() {
  historyOpen.value = false;
  clearHistory();
  closeAction();
}
watch(
  target,
  () => {
    writer?.abort();
    saving.value = false;
    reason.value = "";
    writeFailed.value = false;
    if (target.value === undefined) action.value = "choose";
  },
  { flush: "sync" }
);
watch(
  [
    viewer,
    () => props.siteModerator,
    () => props.canModerate,
    () => props.conversationSlugId,
  ],
  clearAll,
  { flush: "sync" }
);
watch(() => redaction.resyncVersion, clearAll, { flush: "sync" });
onDeactivated(clearAll);
onUnmounted(() => {
  reader?.abort();
  writer?.abort();
});
watch(
  historyOpen,
  (open) => {
    clearHistory();
    if (open) void loadHistory();
  },
  { flush: "sync" }
);
async function loadHistory() {
  if (loading.value || !historyOpen.value) return;
  reader?.abort();
  const controller = new AbortController();
  reader = controller;
  loading.value = true;
  readFailed.value = false;
  try {
    const page = await moderationHistory({
      request: {
        conversationSlugId: props.conversationSlugId,
        beforeId: cursor.value,
      },
      signed: viewer.value.userId !== undefined,
      signal: controller.signal,
    });
    if (controller.signal.aborted) return;
    rows.value.push(...page.items);
    cursor.value = page.nextBeforeId;
  } catch {
    if (!controller.signal.aborted) readFailed.value = true;
  } finally {
    if (!controller.signal.aborted) loading.value = false;
  }
}
async function save(next: "move" | "hide" | "restore") {
  if (disabled.value || target.value === undefined) return;
  const controller = new AbortController();
  writer = controller;
  saving.value = true;
  writeFailed.value = false;
  try {
    await moderateItem({
      request: {
        conversationSlugId: props.conversationSlugId,
        itemSlugId: target.value,
        action: next,
        reason: reason.value.trim(),
      },
      signal: controller.signal,
    });
    if (controller.signal.aborted) return;
    clearAll();
    emit("changed");
  } catch {
    if (!controller.signal.aborted) writeFailed.value = true;
  } finally {
    if (!controller.signal.aborted) saving.value = false;
  }
}
</script>
