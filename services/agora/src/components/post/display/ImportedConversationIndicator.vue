<template>
  <div class="imported-indicator">
    <span class="imported-label">{{ t("importedLabel") }}</span>
    <q-btn
      flat
      dense
      round
      size="sm"
      icon="mdi-information-outline"
      color="grey-7"
      @click="showDialog = true"
    />

    <q-dialog v-model="showDialog" position="bottom">
      <ZKBottomDialogContainer :title="t('dialogTitle')">
        <div class="details">
          <div class="detail-row">
            <span class="detail-label">{{ t("importMethodLabel") }}:</span>
            <span>{{
              importInfo.method === "url"
                ? t("importMethodUrl")
                : t("importMethodCsv")
            }}</span>
          </div>

          <div v-if="importInfo.sourceUrl" class="detail-row">
            <span class="detail-label">{{ t("sourceUrlLabel") }}:</span>
            <a
              :href="importInfo.sourceUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="detail-link"
            >
              {{ importInfo.sourceUrl }}
            </a>
          </div>

          <div v-if="importInfo.conversationUrl" class="detail-row">
            <span class="detail-label"
              >{{ t("conversationUrlLabel") }}:</span
            >
            <a
              :href="importInfo.conversationUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="detail-link"
            >
              {{ importInfo.conversationUrl }}
            </a>
          </div>

          <div v-if="importInfo.exportUrl" class="detail-row">
            <span class="detail-label">{{ t("exportUrlLabel") }}:</span>
            <a
              :href="importInfo.exportUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="detail-link"
            >
              {{ importInfo.exportUrl }}
            </a>
          </div>

          <div v-if="importInfo.author" class="detail-row">
            <span class="detail-label">{{ t("originalAuthorLabel") }}:</span>
            <span>{{ importInfo.author }}</span>
          </div>

          <div v-if="importInfo.createdAt" class="detail-row">
            <span class="detail-label">{{ t("originalDateLabel") }}:</span>
            <span>{{ formattedDate }}</span>
          </div>

          <div class="analysis-note">
            {{ t("analysisNote") }}
          </div>
        </div>
      </ZKBottomDialogContainer>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { computed, ref } from "vue";

import {
  type ImportedConversationIndicatorTranslations,
  importedConversationIndicatorTranslations,
} from "./ImportedConversationIndicator.i18n";

const props = defineProps<{
  importInfo: {
    method: "url" | "csv";
    sourceUrl?: string;
    conversationUrl?: string;
    exportUrl?: string;
    createdAt?: string | Date;
    author?: string;
  };
}>();

const { t } = useComponentI18n<ImportedConversationIndicatorTranslations>(
  importedConversationIndicatorTranslations
);

const showDialog = ref(false);

const formattedDate = computed(() => {
  if (props.importInfo.createdAt === undefined) {
    return "";
  }
  const date =
    props.importInfo.createdAt instanceof Date
      ? props.importInfo.createdAt
      : new Date(props.importInfo.createdAt);
  return date.toLocaleDateString();
});
</script>

<style lang="scss" scoped>
.imported-indicator {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.imported-label {
  font-style: italic;
  color: $color-text-weak;
  font-size: 0.85rem;
}

.details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-row {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.detail-label {
  font-weight: var(--font-weight-medium);
  font-size: 0.85rem;
  color: $color-text-weak;
}

.detail-link {
  color: $primary;
  word-break: break-all;
}

.analysis-note {
  font-style: italic;
  color: $color-text-weak;
  font-size: 0.85rem;
  padding-top: 0.5rem;
}
</style>
