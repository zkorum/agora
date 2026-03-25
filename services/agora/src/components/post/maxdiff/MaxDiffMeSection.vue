<template>
  <!-- Complete: show ranked list (MaxDiffItemListSection has its own header) -->
  <template v-if="rankingComplete">
    <MaxDiffItemListSection
      :section-title="t('meTitle')"
      :subtitle="t('meSubtitle')"
      :items="rankingItems"
      :is-loading="false"
      no-items-message=""
      score-label=""
      :compact-mode="compactMode"
      :on-click-item="props.onClickItem"
      :on-switch-tab="props.onSwitchTab"
      :on-learn-more="props.onLearnMore"
    />
    <div class="me-stats">
      {{ t("meProgress", { percent: String(progress.percent), votes: formatAmount(progress.votes) }) }}
    </div>
  </template>

  <!-- Not complete: show title + progress banner -->
  <div v-else>
    <div class="me-incomplete-header">
      <span class="me-incomplete-title">{{ t("meTitle") }}</span>
      <a class="me-learn-more-link" @click="props.onLearnMore()">{{ t("learnMore") }}</a>
    </div>
    <div class="me-banner">
      <div class="me-banner-content">
        <div v-if="hasVoted" class="me-banner-message">{{ t("meVotesCounted") }}</div>
        <div class="me-banner-progress">
          {{ t("meProgress", { percent: String(progress.percent), votes: formatAmount(progress.votes) }) }}
        </div>
        <a class="me-keep-voting-link" @click="props.navigateToVotingTab()">
          {{ hasVoted ? t("meKeepVoting") : t("meStartVoting") }}
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ApiV1MaxdiffLoadPost200Response } from "src/api";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { MaxDiffComparison } from "src/shared/types/zod";
import { formatAmount } from "src/utils/common";
import { restoreMaxDiff } from "src/utils/maxdiff";
import { computed } from "vue";

import type { MaxDiffListItem } from "./MaxDiffItemListSection.vue";
import MaxDiffItemListSection from "./MaxDiffItemListSection.vue";
import {
  type MaxDiffResultsTabTranslations,
  maxDiffResultsTabTranslations,
} from "./MaxDiffResultsTab.i18n";

interface ClickItemData {
  title: string;
  body: string | null;
  externalUrl: string | null;
}

const props = defineProps<{
  loadData: ApiV1MaxdiffLoadPost200Response | undefined;
  allItems: MaxDiffListItem[];
  compactMode: boolean;
  onClickItem: (item: ClickItemData) => void;
  onSwitchTab: () => void;
  onLearnMore: () => void;
  navigateToVotingTab: () => void;
}>();

const { t } = useComponentI18n<MaxDiffResultsTabTranslations>(
  maxDiffResultsTabTranslations,
);

function parseComparisons(): MaxDiffComparison[] {
  const data = props.loadData;
  if (data === undefined || data.comparisons === null) return [];
  return data.comparisons.map((c) => ({
    best: c.best,
    worst: c.worst,
    set: c.set,
  }));
}

const restoredInstance = computed(() => {
  const comparisons = parseComparisons();
  if (comparisons.length === 0) return null;
  const itemSlugIds = props.allItems.map((i) => i.slugId);
  if (itemSlugIds.length < 2) return null;
  return restoreMaxDiff({ items: itemSlugIds, comparisons });
});

const rankingComplete = computed(() =>
  restoredInstance.value?.complete ?? false,
);

const rankingItems = computed<MaxDiffListItem[]>(() => {
  const instance = restoredInstance.value;
  if (instance === null || !instance.complete || instance.result === undefined) return [];
  const itemMap = new Map(props.allItems.map((i) => [i.slugId, i]));
  return instance.result
    .map((slugId) => itemMap.get(slugId))
    .filter((item): item is MaxDiffListItem => item !== undefined)
    .map((item) => ({ ...item, score: null }));
});

const progress = computed(() => {
  const instance = restoredInstance.value;
  if (instance === null) return { percent: 0, votes: 0 };
  return {
    percent: Math.round(instance.progress * 100),
    votes: parseComparisons().length,
  };
});

const hasVoted = computed(() => progress.value.votes > 0);
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

.me-learn-more-link {
  font-size: 0.8rem;
  color: $color-text-weak;
  cursor: pointer;

  &:hover {
    color: $primary;
  }
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
