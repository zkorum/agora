<template>
  <q-dialog v-model="showDialog" position="bottom">
    <ZKBottomDialogContainer>
      <ZKDialogOptionsList
        :options="aiLabelingOptions"
        :selected-value="aiLabelingEnabled ? 'on' : 'off'"
        @option-selected="handleOptionSelected"
      />
    </ZKBottomDialogContainer>
  </q-dialog>
</template>

<script setup lang="ts">
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import ZKDialogOptionsList from "src/components/ui-library/ZKDialogOptionsList.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";

import {
  type AiLabelingOptionsDialogTranslations,
  aiLabelingOptionsDialogTranslations,
} from "./AiLabelingOptionsDialog.i18n";

const showDialog = defineModel<boolean>("showDialog", { required: true });
const aiLabelingEnabled = defineModel<boolean>("aiLabelingEnabled", {
  required: true,
});

const { t } = useComponentI18n<AiLabelingOptionsDialogTranslations>(
  aiLabelingOptionsDialogTranslations
);

const aiLabelingOptions = [
  {
    title: t("aiOnTitle"),
    description: t("aiOnDescription"),
    value: "on",
  },
  {
    title: t("aiOffTitle"),
    description: t("aiOffDescription"),
    value: "off",
  },
];

function handleOptionSelected(option: {
  title: string;
  description: string;
  value: string;
}): void {
  aiLabelingEnabled.value = option.value === "on";
  showDialog.value = false;
}
</script>
