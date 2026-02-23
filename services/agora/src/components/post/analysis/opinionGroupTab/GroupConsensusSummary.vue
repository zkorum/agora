<template>
  <div>
    <div class="container">
      <div><img src="/images/icons/stars.svg" class="iconStyle" /></div>
      <div class="messageBody">
        <div class="titleBar">
          <div class="titleString">{{ summaryTitle }}</div>

          <AnalysisActionButton
            type="learnMore"
            @action-click="showInformationDialog = true"
          />
        </div>
        <div>
          {{ summary }}
        </div>
      </div>
    </div>

    <q-dialog v-model="showInformationDialog" position="bottom">
      <ZKBottomDialogContainer>
        <div class="titleStyle">{{ t("aiSummaryTitle") }}</div>

        <div>
          {{ t("aiSummaryDescription") }}
        </div>
      </ZKBottomDialogContainer>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { ref } from "vue";

import AnalysisActionButton from "../common/AnalysisActionButton.vue";
import {
  type GroupConsensusSummaryTranslations,
  groupConsensusSummaryTranslations,
} from "./GroupConsensusSummary.i18n";

defineProps<{
  summary: string;
}>();

const { t } = useComponentI18n<GroupConsensusSummaryTranslations>(
  groupConsensusSummaryTranslations
);

const summaryTitle = t("groupSummaryTitle");

const showInformationDialog = ref(false);
</script>

<style lang="scss" scoped>
.container {
  display: grid;
  grid-template-columns: min-content 1fr;
  grid-template-rows: 1fr;
  gap: 0px 1rem;
  grid-template-areas: ". .";
  margin-top: 12px;
  padding-top: 16px;
  padding-bottom: 16px;
}

.iconStyle {
  width: 1.5rem;
}

.titleBar {
  display: flex;
  gap: 1rem;
  justify-content: space-between;
}

.titleString {
  font-size: 1rem;
  font-weight: var(--font-weight-medium);
}

.messageBody {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.titleStyle {
  font-weight: var(--font-weight-medium);
  font-size: 1.1rem;
}
</style>
