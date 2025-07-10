<template>
  <div>
    <AnalysisSectionWrapper>
      <template #header>
        <AnalysisTitleHeader
          :show-star-in-title="true"
          title="Where do I stand"
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
import { ShortcutItem } from "src/utils/component/analysis/shortcutBar";
import { PolisKey } from "src/shared/types/zod";
import { formatClusterLabel } from "src/utils/component/opinion";

const props = defineProps<{
  clusterKey: PolisKey | undefined; // happens when the user has not been found to belong to a given cluster
  aiLabel: string | undefined;
  aiSummary: string | undefined;
}>();

const currentTab = defineModel<ShortcutItem>();

function getUserAnalysis() {
  if (props.clusterKey === undefined) {
    return "Vote on more opinions to unlock";
  }
  const firstPart = `You agree with ${formatClusterLabel(props.clusterKey, true, props.aiLabel)}`;
  if (props.aiSummary === undefined) {
    return firstPart;
  }
  return `${firstPart} - ${props.aiSummary}`;
}

function switchTab() {
  currentTab.value = "Groups";
}
</script>

<style lang="scss" scoped></style>
