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
        <div>
          You agree with Fiscal Reform - Fiscal reformists push for reforms
          related to how the government collects revenue (taxation) and how it
          spends money (public spending or budget allocation)
        </div>
      </template>
    </AnalysisSectionWrapper>
  </div>
</template>

<script setup lang="ts">
import AnalysisSectionWrapper from "../common/AnalysisSectionWrapper.vue";
import AnalysisTitleHeader from "../common/AnalysisTitleHeader.vue";
import AnalysisActionButton from "../common/AnalysisActionButton.vue";
import { ShortcutItem } from "src/utils/component/analysis/shortcutBar";

const currentTab = defineModel<ShortcutItem>();

function switchTab() {
  currentTab.value = "Opinion Groups";
}
</script>

<style lang="scss" scoped></style>
