<template>
  <div>
    <AnalysisSectionWrapper>
      <template #header>
        <AnalysisTitleHeader :show-star-in-title="false">
          <template #title>
            <template v-if="compactMode && isSmallScreen">
              <span :style="{ color: keywordColor }">{{ shortTitle }}</span>
            </template>
            <template v-else>
              {{ titleParts[0]
              }}<span :style="{ color: keywordColor }">{{ keyword }}</span
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
              @action-click="showInfoDialog = true"
            />
          </template>
        </AnalysisTitleHeader>
      </template>

      <template #body>
        <div v-if="!compactMode" class="statistical-subtitle">
          {{ props.direction === "agree" ? t("subtitleAgree") : t("subtitleDisagree") }}
        </div>

        <EmptyStateMessage
          v-if="
            props.itemList.length === 0 ||
            Object.keys(props.clusters).length <= 1 ||
            representativeItems.length === 0
          "
          :message="emptyMessage"
        />

        <template v-if="props.itemList.length > 0 && Object.keys(props.clusters).length > 1">
          <ConsensusItem
            v-for="consensusItem in representativeItems"
            :key="consensusItem.opinion"
            :conversation-slug-id="props.conversationSlugId"
            :opinion-item="consensusItem"
            :opinion-item-for-visualizer="consensusItem"
            :cluster-labels="props.clusterLabels"
          />

          <div
            v-if="additionalItems.length > 0"
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

          <button
            v-if="
              !compactMode &&
              remainingCount > 0 &&
              !hasLoadedMore
            "
            class="load-more-button"
            @click="handleLoadMore"
          >
            {{ t("loadMore") }} ({{ remainingCount }})
          </button>
        </template>
      </template>
    </AnalysisSectionWrapper>

    <CommonGroundInformationDialog
      v-model="showInfoDialog"
      :direction="props.direction"
    />
    <ZKConfirmDialog
      v-model="showLoadMoreWarning"
      :title="tWarning('title')"
      :confirm-text="tWarning('loadMoreButton')"
      :cancel-text="tWarning('cancelButton')"
      @confirm="hasLoadedMore = true"
    >
      {{ warningDescriptionParts[0] }}<em>{{ tWarning('descriptionEmphasis') }}</em>{{ warningDescriptionParts[1] }}
    </ZKConfirmDialog>
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
import CommonGroundInformationDialog from "./CommonGroundInformationDialog.vue";
import ConsensusItem from "./ConsensusItem.vue";
import {
  type ConsensusTabTranslations,
  consensusTabTranslations,
} from "./ConsensusTab.i18n";

const props = defineProps<{
  conversationSlugId: string;
  direction: "agree" | "disagree";
  itemList: AnalysisOpinionItem[];
  compactMode: boolean;
  clusters: Partial<PolisClusters>;
  clusterLabels: Partial<Record<PolisKey, string>>;
}>();

const currentTab = defineModel<ShortcutItem>({ required: true });

const { t } = useComponentI18n<ConsensusTabTranslations>(
  consensusTabTranslations
);

const { t: tWarning } = useComponentI18n<LoadMoreWarningDialogTranslations>(
  loadMoreWarningDialogTranslations
);

const isSmallScreen = useMediaQuery("(max-width: 599px)");
const keywordColor = computed(() =>
  props.direction === "agree" ? "#6b4eff" : "#a05e03"
);
const showInfoDialog = ref(false);

const shortTitle = computed(() =>
  props.direction === "agree"
    ? t("agreementsTitle")
    : t("disagreementsTitle")
);

const keyword = computed(() =>
  props.direction === "agree"
    ? t("agreementsKeyword")
    : t("disagreementsKeyword")
);

const titleParts = computed(() => {
  const template =
    props.direction === "agree"
      ? t("agreementsLongTitle")
      : t("disagreementsLongTitle");
  return template.split("{keyword}");
});

const emptyMessage = computed(() =>
  props.direction === "agree"
    ? t("noAgreementsMessage")
    : t("noDisagreementsMessage")
);

const warningDescriptionParts = computed(() =>
  tWarning("description").split("{emphasis}")
);

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
  getRawScore: (item) =>
    props.direction === "agree"
      ? item.groupAwareConsensusAgree
      : item.groupAwareConsensusDisagree,
  minScore: 0.6,
});

function switchTab() {
  currentTab.value =
    props.direction === "agree" ? "Agreements" : "Disagreements";
}
</script>

<style lang="scss" scoped>
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
