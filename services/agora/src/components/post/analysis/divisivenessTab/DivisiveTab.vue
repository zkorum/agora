<template>
  <div>
    <AnalysisSectionWrapper>
      <template #header>
        <AnalysisTitleHeader :show-star-in-title="false">
          <template #title>
            <template v-if="compactMode && isSmallScreen">
              <span class="gradient-text">{{ t("divisiveTitle") }}</span>
            </template>
            <template v-else>
              {{ titleParts[0]
              }}<span class="gradient-text">{{ keyword }}</span
              >{{ titleParts[1] }}
            </template>
          </template>
          <template #action-button>
            <AnalysisActionButton
              v-if="compactMode"
              type="viewMore"
              @action-click="switchTab()"
            />
            <AnalysisActionButton
              v-else
              type="learnMore"
              @action-click="showDivisiveInfo = true"
            />
          </template>
        </AnalysisTitleHeader>
      </template>

      <template #body>
        <div v-if="!compactMode" class="statistical-subtitle">
          {{ t("statisticalSubtitle") }}
        </div>

        <EmptyStateMessage
          v-if="
            props.itemList.length === 0 ||
            Object.keys(props.clusters).length <= 1
          "
          :message="t('noDivisiveOpinionsMessage')"
        />
        <template v-else>
          <ConsensusItem
            v-for="consensusItem in representativeItems"
            :key="consensusItem.opinion"
            :conversation-slug-id="props.conversationSlugId"
            :opinion-item="consensusItem"
            :opinion-item-for-visualizer="consensusItem"
            :cluster-labels="props.clusterLabels"
          />

          <div
            v-if="
              additionalItems.length > 0 ||
              (representativeItems.length === 0 && !compactMode)
            "
            class="reliability-divider"
          >
            <span>{{ t("lowerRankedDivider") }}</span>
          </div>

          <div
            v-for="consensusItem in additionalItems"
            :key="consensusItem.opinion"
            class="muted-item"
          >
            <ConsensusItem
              :conversation-slug-id="props.conversationSlugId"
              :opinion-item="consensusItem"
              :opinion-item-for-visualizer="consensusItem"
              :cluster-labels="props.clusterLabels"
            />
          </div>

          <template v-if="representativeItems.length === 0 && !compactMode">
            <div
              v-for="consensusItem in props.itemList"
              :key="consensusItem.opinion"
              class="muted-item"
            >
              <ConsensusItem
                :conversation-slug-id="props.conversationSlugId"
                :opinion-item="consensusItem"
                :opinion-item-for-visualizer="consensusItem"
                :cluster-labels="props.clusterLabels"
              />
            </div>
          </template>

          <button
            v-if="
              !compactMode &&
              remainingCount > 0 &&
              !hasLoadedMore &&
              Object.keys(props.clusters).length > 1 &&
              representativeItems.length > 0
            "
            class="load-more-button"
            @click="handleLoadMore"
          >
            {{ t("loadMore") }} ({{ remainingCount }})
          </button>
        </template>
      </template>
    </AnalysisSectionWrapper>

    <DivisiveInformationDialog v-model="showDivisiveInfo" />
    <ZKConfirmDialog
      v-model="showLoadMoreWarning"
      :title="tWarning('title')"
      :message="tWarning('description')"
      :confirm-text="tWarning('loadMoreButton')"
      :cancel-text="tWarning('cancelButton')"
      @confirm="hasLoadedMore = true"
    />
  </div>
</template>

<script setup lang="ts">
import { useMediaQuery } from "@vueuse/core";
import ZKConfirmDialog from "src/components/ui-library/ZKConfirmDialog.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type {
  AnalysisOpinionItem,
  PolisClusters,
  PolisKey,
} from "src/shared/types/zod";
import type { ShortcutItem } from "src/utils/component/analysis/shortcutBar";
import { useAnalysisDisplayList } from "src/utils/component/analysis/statisticalRelevance";
import { computed, ref, toRef } from "vue";

import AnalysisActionButton from "../common/AnalysisActionButton.vue";
import AnalysisSectionWrapper from "../common/AnalysisSectionWrapper.vue";
import AnalysisTitleHeader from "../common/AnalysisTitleHeader.vue";
import EmptyStateMessage from "../common/EmptyStateMessage.vue";
import {
  type LoadMoreWarningDialogTranslations,
  loadMoreWarningDialogTranslations,
} from "../common/LoadMoreWarningDialog.i18n";
import ConsensusItem from "../consensusTab/ConsensusItem.vue";
import DivisiveInformationDialog from "./DivisiveInformationDialog.vue";
import {
  type DivisiveTabTranslations,
  divisiveTabTranslations,
} from "./DivisiveTab.i18n";

const props = defineProps<{
  conversationSlugId: string;
  itemList: AnalysisOpinionItem[];
  compactMode: boolean;
  clusters: Partial<PolisClusters>;
  clusterLabels: Partial<Record<PolisKey, string>>;
}>();

const currentTab = defineModel<ShortcutItem>({ required: true });

const { t } = useComponentI18n<DivisiveTabTranslations>(
  divisiveTabTranslations
);

const { t: tWarning } = useComponentI18n<LoadMoreWarningDialogTranslations>(
  loadMoreWarningDialogTranslations
);

const isSmallScreen = useMediaQuery("(max-width: 599px)");
const keyword = computed(() => t("divisiveKeyword"));
const titleParts = computed(() => t("divisiveLongTitle").split("{keyword}"));
const showDivisiveInfo = ref(false);

const {
  representativeItems,
  additionalItems,
  remainingCount,
  showLoadMoreWarning,
  hasLoadedMore,
  handleLoadMore,
} = useAnalysisDisplayList({
  items: toRef(props, "itemList"),
  compactMode: toRef(props, "compactMode"),
  getRawScore: (item) => item.divisiveScore,
});

function switchTab() {
  currentTab.value = "Divisive";
}
</script>

<style lang="scss" scoped>
.gradient-text {
  background: linear-gradient(90deg, #6b4eff 0%, #a05e03 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.statistical-subtitle {
  font-size: 0.875rem;
  color: #6d6a74;
  margin-bottom: 0.5rem;
}

.reliability-divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0.75rem 0;

  &::before,
  &::after {
    content: "";
    flex: 1;
    height: 1px;
    background-color: #e9e9f1;
  }

  span {
    font-size: 0.75rem;
    color: #9e9ba5;
    white-space: nowrap;
  }
}

.muted-item {
  opacity: 0.55;
}

.load-more-button {
  background: transparent;
  border: 1px solid #e9e9f1;
  cursor: pointer;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: var(--font-weight-medium);
  color: #6d6a74;
  border-radius: 8px;
  transition: background-color 0.2s;
  align-self: center;
  margin-top: 0.75rem;

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
}
</style>
