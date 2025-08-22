<template>
  <div>
    <AnalysisSectionWrapper>
      <template #header>
        <AnalysisTitleHeader
          :show-star-in-title="true"
          :title="t('whereDoIStandTitle')"
        >
          <template #action-button>
            <div @click="switchTab()">
              <AnalysisActionButton
                :type="currentTab == 'Summary' ? 'learnMore' : 'none'"
              />
            </div>
          </template>
        </AnalysisTitleHeader>
      </template>

      <template #body>
        <div>{{ getUserAnalysis() }}</div>
      </template>
    </AnalysisSectionWrapper>
  </div>
</template>

<script setup lang="ts">
import AnalysisSectionWrapper from "../common/AnalysisSectionWrapper.vue";
import AnalysisTitleHeader from "../common/AnalysisTitleHeader.vue";
import AnalysisActionButton from "../common/AnalysisActionButton.vue";
import type { ShortcutItem } from "src/utils/component/analysis/shortcutBar";
import type { PolisKey } from "src/shared/types/zod";
import { formatClusterLabel } from "src/utils/component/opinion";
import { useComponentI18n } from "src/composables/useComponentI18n";
import { meTabTranslations, type MeTabTranslations } from "./MeTab.i18n";

const props = defineProps<{
  clusterKey: PolisKey | undefined; // happens when the user has not been found to belong to a given cluster
  aiLabel: string | undefined;
  aiSummary: string | undefined;
}>();

const currentTab = defineModel<ShortcutItem>();

const { t } = useComponentI18n<MeTabTranslations>(meTabTranslations);

function getUserAnalysis() {
  if (props.clusterKey === undefined) {
    return t("voteMoreToUnlock");
  }
  const firstPart = `${t("youAgreeWith")} ${formatClusterLabel(props.clusterKey, true, props.aiLabel)}`;
  if (props.aiSummary === undefined) {
    return firstPart;
  }
  return `${firstPart} - ${props.aiSummary}`;
}

function switchTab() {
  currentTab.value = "Me";
}
</script>

<style lang="scss" scoped></style>
