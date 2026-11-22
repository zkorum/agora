<template>
  <!-- Complete: show ranked list (ComparisonItemListSection has its own header) -->
  <template v-if="rankingComplete">
    <ComparisonItemListSection
      :conversation-slug-id="conversationSlugId"
      :section-title="t('meTitle')"
      :subtitle="t('meSubtitle')"
      :items="rankingItems"
      :is-loading="false"
      no-items-message=""
      :compact-mode="compactMode"
      :on-click-item="props.onClickItem"
      :on-switch-tab="props.onSwitchTab"
      :on-learn-more="props.onLearnMore"
    />
    <div class="me-stats">
      {{ progressLabel }}
    </div>
  </template>

  <!-- Not complete: show title + progress banner -->
  <div v-else>
    <div class="me-incomplete-header">
      <span class="me-incomplete-title">{{ t("meTitle") }}</span>
      <AnalysisActionButton
        type="learnMore"
        @action-click="props.onLearnMore()"
      />
    </div>
    <div class="me-banner">
      <div class="me-banner-content">
        <div v-if="hasVoted && !isClosed" class="me-banner-message">
          {{ t("meVotesCounted") }}
        </div>
        <div class="me-banner-progress">
          {{ progressLabel }}
        </div>
        <a
          v-if="!isClosed"
          class="me-keep-voting-link"
          @click="props.navigateToVotingTab()"
        >
          {{ hasVoted ? t("meKeepVoting") : t("meStartVoting") }}
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AnalysisActionButton from "src/components/post/analysis/common/AnalysisActionButton.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useDisplayNumbers } from "src/i18n/numberFormats";
import type { ComparisonLoadResponse } from "src/shared/types/dto";
import { restoreComparisonEngine } from "src/shared/utils/comparisonEngine";
import { computed } from "vue";

import type { ComparisonListItem } from "./ComparisonItemListSection.vue";
import ComparisonItemListSection from "./ComparisonItemListSection.vue";
import {
  type ComparisonResultsTabTranslations,
  comparisonResultsTabTranslations,
} from "./ComparisonResultsTab.i18n";

interface ClickItemData {
  itemSlugId: string;
  displayContent: Exclude<ComparisonListItem["displayContent"], undefined>;
  externalUrl: string | null;
}

const props = defineProps<{
  isClosed: boolean;
  conversationSlugId: string;
  loadData: ComparisonLoadResponse | undefined;
  allItems: ComparisonListItem[];
  compactMode: boolean;
  onClickItem: (item: ClickItemData) => void;
  onSwitchTab: () => void;
  onLearnMore: () => void;
  navigateToVotingTab: () => void;
}>();

const numbers = useDisplayNumbers();
const { t } = useComponentI18n<ComparisonResultsTabTranslations>(
  comparisonResultsTabTranslations
);

const comparisons = computed(() => props.loadData?.comparisons ?? []);

const restoredInstance = computed(() => {
  if (comparisons.value.length === 0) return null;
  const itemSlugIds = props.allItems.map((i) => i.slugId);
  if (itemSlugIds.length < 2) return null;
  return restoreComparisonEngine({
    items: itemSlugIds,
    comparisons: comparisons.value,
  });
});

const rankingComplete = computed(
  () => restoredInstance.value?.complete ?? false
);

const rankingItems = computed<ComparisonListItem[]>(() => {
  const instance = restoredInstance.value;
  if (instance === null || !instance.complete || instance.result === undefined)
    return [];
  const itemMap = new Map(props.allItems.map((i) => [i.slugId, i]));
  const scoreMap = new Map(
    (props.loadData?.perUserScores ?? []).map((s) => [s.entitySlugId, s.score])
  );
  return instance.result
    .map((slugId) => itemMap.get(slugId))
    .filter((item): item is ComparisonListItem => item !== undefined)
    .map((item) => ({ ...item, score: scoreMap.get(item.slugId) ?? null }));
});

const progressLabel = computed(() =>
  t("meProgress", {
    percent: numbers.percent(restoredInstance.value?.progress ?? 0),
    votes: numbers.integer(comparisons.value.length),
  })
);
const hasVoted = computed(() => comparisons.value.length > 0);
</script>

<style lang="scss" scoped>
.me-incomplete-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.me-incomplete-title {
  font-size: 1rem;
  font-weight: var(--font-weight-semibold);
  color: $color-text-strong;
}

.me-banner {
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 0.75rem 1rem;
}

.me-banner-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.me-banner-message {
  color: #495057;
  font-size: 0.875rem;
}

.me-banner-progress {
  color: $color-text-weak;
  font-size: 0.8rem;
}

.me-keep-voting-link {
  color: $primary;
  font-size: 0.875rem;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    text-decoration: underline;
  }
}

.me-stats {
  color: $color-text-weak;
  font-size: 0.8rem;
  margin-top: 0.5rem;
}
</style>
