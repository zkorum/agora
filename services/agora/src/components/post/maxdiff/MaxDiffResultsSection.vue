<template>
  <AnalysisSectionWrapper>
    <template #header>
      <AnalysisTitleHeader :title="t('title')" :show-star-in-title="false">
        <template #action-button>
          <AnalysisActionButton
            :type="compactMode ? 'viewMore' : 'learnMore'"
            @action-click="compactMode ? props.onSwitchTab() : props.onLearnMore()"
          />
        </template>
      </AnalysisTitleHeader>
    </template>

    <template #body>
      <div v-if="!compactMode" class="subtitle">
        {{ t("subtitle") }}
      </div>

      <div class="list-container">
        <ol class="results-list">
          <li
            v-for="(item, index) in displayRankings"
            :key="item.itemSlugId"
            class="result-item"
            @click="props.onClickItem({ title: item.title, body: item.body, externalUrl: item.externalUrl })"
          >
            <span class="rank-number">{{ index + 1 }}</span>
            <div class="result-details">
              <ZKHtmlContent
                class="result-content"
                :html-body="item.title"
                :compact-mode="true"
                :enable-links="false"
              />
              <div class="result-meta">
                <div class="score-bar-container">
                  <div class="score-bar">
                    <div
                      class="score-fill"
                      :style="{ width: `${item.score * 100}%` }"
                    ></div>
                  </div>
                </div>
                <span class="score-text">
                  {{ t("score").replace("{score}", (item.score * 100).toFixed(0) + "%") }}
                </span>
              </div>
            </div>
          </li>
        </ol>

        <div v-if="compactMode && hasMore" class="fade-overlay"></div>
      </div>
    </template>
  </AnalysisSectionWrapper>
</template>

<script setup lang="ts">
import AnalysisActionButton from "src/components/post/analysis/common/AnalysisActionButton.vue";
import AnalysisSectionWrapper from "src/components/post/analysis/common/AnalysisSectionWrapper.vue";
import AnalysisTitleHeader from "src/components/post/analysis/common/AnalysisTitleHeader.vue";
import ZKHtmlContent from "src/components/ui-library/ZKHtmlContent.vue";
import { computed } from "vue";

import type { MaxDiffResultsTabTranslations } from "./MaxDiffResultsTab.i18n";

interface RankingItem {
  itemSlugId: string;
  title: string;
  body: string | null;
  score: number;
  externalUrl: string | null;
}

interface ClickItemData {
  title: string;
  body: string | null;
  externalUrl: string | null;
}

const props = defineProps<{
  rankings: RankingItem[];
  compactMode: boolean;
  t: (key: keyof MaxDiffResultsTabTranslations) => string;
  onClickItem: (item: ClickItemData) => void;
  onSwitchTab: () => void;
  onLearnMore: () => void;
}>();

const COMPACT_LIMIT = 3;

const displayRankings = computed(() =>
  props.compactMode
    ? props.rankings.slice(0, COMPACT_LIMIT)
    : props.rankings,
);

const hasMore = computed(
  () => props.rankings.length > COMPACT_LIMIT,
);
</script>

<style scoped lang="scss">
.subtitle {
  font-size: 0.85rem;
  color: $color-text-weak;
  margin-bottom: 0.5rem;
}

.list-container {
  position: relative;
}

.results-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.result-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: $app-background-color;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
}

.rank-number {
  font-weight: var(--font-weight-semibold);
  color: $primary;
  min-width: 1.5rem;
  text-align: center;
  padding-top: 2px;
}

.result-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.result-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.score-bar-container {
  flex: 1;
  max-width: 120px;
}

.score-bar {
  height: 4px;
  background: $color-border-weak;
  border-radius: 2px;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  background: $primary;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.score-text {
  font-size: 0.75rem;
  color: $color-text-weak;
  white-space: nowrap;
}

.fade-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3rem;
  background: linear-gradient(transparent, white);
  pointer-events: none;
}
</style>
