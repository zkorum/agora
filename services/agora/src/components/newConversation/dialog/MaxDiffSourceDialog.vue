<template>
  <q-dialog v-model="showDialog" position="bottom">
    <ZKBottomDialogContainer>
      <ZKDialogOptionsList
        :options="sourceOptions"
        :selected-value="selectedValue"
        @option-selected="handleOptionSelected"
      />
    </ZKBottomDialogContainer>
  </q-dialog>
</template>

<script setup lang="ts">
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import ZKDialogOptionsList from "src/components/ui-library/ZKDialogOptionsList.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { ExternalSourceConfig } from "src/shared/types/zod";
import { computed } from "vue";

import {
  type MaxDiffSourceDialogTranslations,
  maxDiffSourceDialogTranslations,
} from "./MaxDiffSourceDialog.i18n";

const props = defineProps<{
  currentConfig: ExternalSourceConfig | null;
  onSourceSelected: (config: ExternalSourceConfig | null) => void;
}>();

const showDialog = defineModel<boolean>({ required: true });

const { t } = useComponentI18n<MaxDiffSourceDialogTranslations>(
  maxDiffSourceDialogTranslations,
);

const sourceOptions = [
  {
    title: t("manualTitle"),
    description: t("manualDescription"),
    value: "manual",
  },
  {
    title: t("githubTitle"),
    description: t("githubDescription"),
    value: "github",
  },
];

const selectedValue = computed(() =>
  props.currentConfig !== null ? "github" : "manual",
);

function handleOptionSelected(option: {
  title: string;
  description: string;
  value: string;
}): void {
  showDialog.value = false;

  if (option.value === "manual") {
    props.onSourceSelected(null);
  } else if (option.value === "github") {
    props.onSourceSelected({
      sourceType: "github_issue",
      repository: props.currentConfig?.repository ?? "",
      label: props.currentConfig?.label ?? "",
    });
  }
}
</script>
