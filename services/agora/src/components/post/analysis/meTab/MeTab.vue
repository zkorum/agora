<template>
  <div>
    <AnalysisSectionWrapper>
      <template #header>
        <AnalysisTitleHeader
          :show-star-in-title="true"
          :title="t('whereDoIStandTitle')"
        >
          <template #action-button>
            <div @click="handleActionButtonClick()">
              <AnalysisActionButton
                :type="getButtonType()"
              />
            </div>
          </template>
        </AnalysisTitleHeader>
      </template>

      <template #body>
        <div>
          <div>{{ getUserAnalysis() }}</div>

          <!-- Vote banner - shown below cluster summary -->
          <div class="voteBanner">
            <div class="bannerContent">
              <div class="bannerMessage">{{ bannerMessage }}</div>
              <a
                class="keepVotingLink"
                @click="navigateToCommentTab()"
              >
                {{ t('voteMore') }}
              </a>
            </div>
          </div>
        </div>
      </template>
    </AnalysisSectionWrapper>
  </div>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { PolisKey } from "src/shared/types/zod";
import type { ShortcutItem } from "src/utils/component/analysis/shortcutBar";
import { formatClusterLabel } from "src/utils/component/opinion";
import { computed, inject } from "vue";

import AnalysisActionButton from "../common/AnalysisActionButton.vue";
import AnalysisSectionWrapper from "../common/AnalysisSectionWrapper.vue";
import AnalysisTitleHeader from "../common/AnalysisTitleHeader.vue";
import { type MeTabTranslations, meTabTranslations } from "./MeTab.i18n";

const props = defineProps<{
  clusterKey: PolisKey | undefined; // happens when the user has not been found to belong to a given cluster
  aiLabel: string | undefined;
  aiSummary: string | undefined;
}>();

const currentTab = defineModel<ShortcutItem>({ required: true });

const { t } = useComponentI18n<MeTabTranslations>(meTabTranslations);

// Inject parent state for navigation
const navigateToCommentTab = inject<() => void>("navigateToCommentTab")!;

function getUserAnalysis() {
  // User not assigned to any cluster
  if (props.clusterKey === undefined) {
    return t("notAssignedToGroup");
  }

  // User has cluster assignment
  const firstPart = `${t("youAgreeWith")} ${formatClusterLabel(props.clusterKey, true, props.aiLabel)}`;
  if (props.aiSummary === undefined) {
    return firstPart;
  }
  return `${firstPart} - ${props.aiSummary}`;
}

function getButtonType(): "viewMore" | "none" {
  // Only show "View More" in Summary tab
  return currentTab.value === "Summary" ? "viewMore" : "none";
}

function handleActionButtonClick() {
  if (currentTab.value === "Summary") {
    // Navigate to Me tab
    currentTab.value = "Me";
  }
}

// Simplified vote banner logic
const bannerMessage = computed(() => {
  // User has cluster assignment - encourage voting to refine
  if (props.clusterKey !== undefined) {
    return t("keepVotingToRefineAnalysis");
  }

  // User not clustered yet - show unlock message
  return t("voteToUnlock");
});
</script>

<style lang="scss" scoped>
.voteBanner {
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 0.75rem 1rem;
  margin-top: 0.75rem;
}

.bannerContent {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.bannerMessage {
  flex: 1;
  color: #495057;
  font-size: 0.875rem;
  font-weight: 400;
}

.keepVotingLink {
  color: $primary;
  font-size: 0.875rem;
  font-weight: 400;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.2s;
}

.keepVotingLink:hover {
  text-decoration: underline;
}
</style>
