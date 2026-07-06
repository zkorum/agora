<template>
  <q-dialog v-model="showDialog" position="bottom">
    <ZKBottomDialogContainer>
      <ZKDialogOptionsList
        :options="postTypeOptions"
        :selected-value="selectedValue"
        @option-selected="handleOptionSelected"
      />
    </ZKBottomDialogContainer>
  </q-dialog>
</template>

<script setup lang="ts">
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import ZKDialogOptionsList from "src/components/ui-library/ZKDialogOptionsList.vue";
import type { ConversationImportSettings } from "src/composables/conversation/draft";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { ConversationTypeConfig } from "src/shared/types/zod";
import { computed } from "vue";

import {
  type PostTypeDialogTranslations,
  postTypeDialogTranslations,
} from "./PostTypeDialog.i18n";

interface ModeChangeConfig {
  importType: "polis-url" | "csv-import" | null;
  conversationTypeConfig: ConversationTypeConfig;
}

const props = defineProps<{
  isMaxDiffAllowed: boolean;
  isImportAllowed: boolean;
}>();

const emit = defineEmits<{
  modeChangeRequested: [config: ModeChangeConfig];
}>();

const { t } = useComponentI18n<PostTypeDialogTranslations>(
  postTypeDialogTranslations
);

const showDialog = defineModel<boolean>({ required: true });
const importSettings = defineModel<ConversationImportSettings>(
  "importSettings",
  { required: true }
);
const conversationTypeConfig = defineModel<ConversationTypeConfig>("conversationTypeConfig", {
  required: true,
});

const postTypeOptions = computed(() => {
  const options = [
    {
      title: t("newConversation"),
      description: t("newConversationDescription"),
      value: "regular",
    },
    {
      title: t("newPrioritization"),
      description: t("newPrioritizationDescription"),
      value: "maxdiff",
    },
    {
      title: t("importFromPolis"),
      description: t("importFromPolisDescription"),
      value: "polis-url",
    },
    {
      title: t("importFromCsv"),
      description: t("importFromCsvDescription"),
      value: "csv-import",
    },
  ];
  return options.filter((option) => {
    if (option.value === "maxdiff") {
      return props.isMaxDiffAllowed;
    }

    if (option.value === "polis-url" || option.value === "csv-import") {
      return props.isImportAllowed;
    }

    return true;
  });
});

const selectedValue = computed(() => {
  if (importSettings.value.importType === "polis-url") return "polis-url";
  if (importSettings.value.importType === "csv-import") return "csv-import";
  return conversationTypeConfig.value.conversationType === "ranking" &&
    conversationTypeConfig.value.rankingMode === "bws"
    ? "maxdiff"
    : "regular";
});

const configMap: Record<string, ModeChangeConfig> = {
  regular: { importType: null, conversationTypeConfig: { conversationType: "polis" } },
  maxdiff: {
    importType: null,
    conversationTypeConfig: { conversationType: "ranking", rankingMode: "bws" },
  },
  "polis-url": {
    importType: "polis-url",
    conversationTypeConfig: { conversationType: "polis" },
  },
  "csv-import": {
    importType: "csv-import",
    conversationTypeConfig: { conversationType: "polis" },
  },
};

function handleOptionSelected(option: {
  title: string;
  description: string;
  value: string;
}): void {
  if (showDialog.value) {
    showDialog.value = false;
  }

  emit(
    "modeChangeRequested",
    configMap[option.value] ?? {
      importType: null,
      conversationTypeConfig: { conversationType: "polis" },
    }
  );
}
</script>
