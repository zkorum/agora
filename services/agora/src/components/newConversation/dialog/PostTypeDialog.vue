<template>
  <q-dialog v-model="showDialog" position="bottom">
    <ZKBottomDialogContainer>
      <ZKDialogOptionsList
        :options="postTypeOptions"
        :selected-value="
          importSettings.importType !== null ? 'import' : 'regular'
        "
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

import {
  type PostTypeDialogTranslations,
  postTypeDialogTranslations,
} from "./PostTypeDialog.i18n";

const emit = defineEmits<{
  modeChangeRequested: [importType: "polis-url" | "csv-import" | null];
}>();

const { t } = useComponentI18n<PostTypeDialogTranslations>(
  postTypeDialogTranslations
);

const showDialog = defineModel<boolean>({ required: true });
const importSettings = defineModel<ConversationImportSettings>(
  "importSettings",
  { required: true }
);

const postTypeOptions = [
  {
    title: t("newConversation"),
    description: t("newConversationDescription"),
    value: "regular",
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

function handleOptionSelected(option: {
  title: string;
  description: string;
  value: string;
}): void {
  if (showDialog.value) {
    showDialog.value = false;
  }

  const importType: "polis-url" | "csv-import" | null =
    option.value === "regular"
      ? null
      : (option.value as "polis-url" | "csv-import");
  emit("modeChangeRequested", importType);
}
</script>
