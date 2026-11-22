<template>
  <q-dialog v-model="showDialog" position="bottom">
    <ZKBottomDialogContainer :title="t('title')">
      <div class="description">
        {{
          isFrozenClosingSurvey
            ? surveyText("frozenClosingSurvey")
            : t("description")
        }}
        <p>{{ t("privacy") }}</p>
      </div>
    </ZKBottomDialogContainer>
  </q-dialog>
</template>

<script setup lang="ts">
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";

import {
  type SurveyInformationDialogTranslations,
  surveyInformationDialogTranslations,
} from "./SurveyInformationDialog.i18n";
import { surveyTabTranslations } from "./SurveyTab.i18n";

defineProps<{ isFrozenClosingSurvey: boolean }>();
const showDialog = defineModel<boolean>({ required: true });
const { t: surveyText } = useComponentI18n(surveyTabTranslations);

const { t } = useComponentI18n<SurveyInformationDialogTranslations>(
  surveyInformationDialogTranslations
);
</script>

<style scoped lang="scss">
.description {
  white-space: pre-line;
}
</style>
