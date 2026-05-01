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

          <AnalysisInlineActionBanner
            v-if="shouldShowVoteBanner"
            class="vote-banner"
            :message="bannerMessage"
            :action-label="t('voteMore')"
            @action-click="props.navigateToDiscoverTab()"
          />
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
import { computed } from "vue";

import AnalysisActionButton from "../common/AnalysisActionButton.vue";
import AnalysisInlineActionBanner from "../common/AnalysisInlineActionBanner.vue";
import AnalysisSectionWrapper from "../common/AnalysisSectionWrapper.vue";
import AnalysisTitleHeader from "../common/AnalysisTitleHeader.vue";
import { type MeTabTranslations, meTabTranslations } from "./MeTab.i18n";

const props = defineProps<{
  clusterKey: PolisKey | undefined; // happens when the user has not been found to belong to a given cluster
  aiLabel: string | undefined;
  aiSummary: string | undefined;
  hasVotedOnAllAvailableOpinions: boolean | undefined;
  navigateToDiscoverTab: () => void;
}>();

const currentTab = defineModel<ShortcutItem>({ required: true });

const { t } = useComponentI18n<MeTabTranslations>(meTabTranslations);

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

const bannerMessage = computed(() => {
  // User has cluster assignment - encourage voting to refine
  if (props.clusterKey !== undefined) {
    return t("keepVotingToRefineAnalysis");
  }

  // User not clustered yet - show unlock message
  return t("voteToUnlock");
});

const shouldShowVoteBanner = computed(
  () => props.hasVotedOnAllAvailableOpinions !== true
);
</script>

<style lang="scss" scoped>
.vote-banner {
  margin-top: 0.75rem;
}
</style>
