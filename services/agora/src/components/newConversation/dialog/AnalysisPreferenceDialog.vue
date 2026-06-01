<template>
  <q-dialog v-model="showDialog" position="bottom">
    <ZKBottomDialogContainer>
      <ZKDialogOptionsList
        :options="preferenceOptions"
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
import type { PreferredOpinionGroupCount } from "src/shared/types/zod";
import { computed } from "vue";

import {
  type AnalysisPreferenceDialogTranslations,
  analysisPreferenceDialogTranslations,
} from "./AnalysisPreferenceDialog.i18n";

const props = defineProps<{
  canUseAnalysisVariantsPreference: boolean;
}>();

const showDialog = defineModel<boolean>("showDialog", { required: true });
const preferredOpinionGroupCount = defineModel<PreferredOpinionGroupCount>(
  "preferredOpinionGroupCount",
  { required: true }
);

const { t } = useComponentI18n<AnalysisPreferenceDialogTranslations>(
  analysisPreferenceDialogTranslations
);

const fixedGroupCounts = [2, 3, 4, 5, 6] as const;

const selectedValue = computed(() => {
  return preferredOpinionGroupCount.value === null
    ? "recommended_default"
    : String(preferredOpinionGroupCount.value);
});

const preferenceOptions = computed(() => [
  {
    title: t("recommendedDefaultTitle"),
    description: t("recommendedDefaultDescription"),
    value: "recommended_default",
  },
  ...fixedGroupCounts.map((count) => ({
    title: t("groupsTitle", { count: String(count) }),
    description: props.canUseAnalysisVariantsPreference
      ? t("groupsDescription", { count: String(count) })
      : t("unavailableDescription"),
    value: String(count),
    disabled: !props.canUseAnalysisVariantsPreference,
  })),
]);

function handleOptionSelected(option: { value: string }): void {
  preferredOpinionGroupCount.value =
    option.value === "recommended_default" ? null : Number(option.value);
  showDialog.value = false;
}
</script>
