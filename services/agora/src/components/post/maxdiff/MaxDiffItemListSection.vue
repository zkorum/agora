<template>
  <AnalysisSectionWrapper>
    <template #header>
      <AnalysisTitleHeader :title="sectionTitle" :show-star-in-title="false">
        <template #action-button>
          <AnalysisActionButton
            v-if="compactMode"
            type="viewMore"
            @action-click="props.onSwitchTab()"
          />
          <AnalysisActionButton
            v-else
            type="learnMore"
            @action-click="props.onLearnMore()"
          />
        </template>
      </AnalysisTitleHeader>
    </template>

    <template #body>
      <PageLoadingSpinner v-if="isLoading" />

      <div v-else-if="items.length === 0" class="info-message">
        {{ noItemsMessage }}
      </div>

      <template v-else>
        <div v-if="subtitle !== null && !compactMode" class="subtitle">
          {{ subtitle }}
        </div>

        <div class="list-container">
          <ol class="item-list">
            <li
              v-for="(item, index) in displayItems"
              :key="item.slugId"
              class="item-row"
              @click="props.onClickItem({ title: item.title, body: item.body, externalUrl: item.externalUrl })"
            >
              <span class="item-number">{{ index + 1 }}</span>
              <div class="item-details">
                <ZKHtmlContent
                  class="item-content"
                  :html-body="item.title"
                  :compact-mode="true"
                  :enable-links="false"
                />
                <div v-if="item.score !== null" class="item-meta">
                  <div class="score-bar-container">
                    <div class="score-bar">
                      <div
                        class="score-fill"
                        :style="{ width: `${item.score * 100}%` }"
                      ></div>
                    </div>
                  </div>
                  <span class="score-text">
                    {{ scoreLabel.replace("{score}", (item.score * 100).toFixed(0) + "%") }}
                  </span>
                </div>
                <div v-else-if="scoreLabel !== ''" class="item-meta">
                  <span class="score-text unranked-text">—</span>
                </div>
              </div>
            </li>
          </ol>

          <div v-if="compactMode && hasMore" class="fade-overlay"></div>
        </div>
      </template>
    </template>
  </AnalysisSectionWrapper>
</template>

<script setup lang="ts">
import AnalysisActionButton from "src/components/post/analysis/common/AnalysisActionButton.vue";
import AnalysisSectionWrapper from "src/components/post/analysis/common/AnalysisSectionWrapper.vue";
import AnalysisTitleHeader from "src/components/post/analysis/common/AnalysisTitleHeader.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import ZKHtmlContent from "src/components/ui-library/ZKHtmlContent.vue";
import { computed } from "vue";

export interface MaxDiffListItem {
  slugId: string;
  title: string;
  body: string | null;
  score: number | null;
  externalUrl: string | null;
}

interface ClickItemData {
  title: string;
  body: string | null;
  externalUrl: string | null;
}

const props = defineProps<{
  sectionTitle: string;
  subtitle: string | null;
  items: MaxDiffListItem[];
  isLoading: boolean;
  noItemsMessage: string;
  scoreLabel: string;
  compactMode: boolean;
  onClickItem: (item: ClickItemData) => void;
  onSwitchTab: () => void;
  onLearnMore: () => void;
}>();

const COMPACT_LIMIT = 3;

const displayItems = computed(() =>
  props.compactMode ? props.items.slice(0, COMPACT_LIMIT) : props.items,
);

const hasMore = computed(() => props.items.length > COMPACT_LIMIT);
</script>

<style scoped lang="scss">
.info-message {
  text-align: center;
  color: $color-text-weak;
  padding: 1rem;
  font-size: 0.9rem;
}

.subtitle {
  font-size: 0.85rem;
  color: $color-text-weak;
  margin-bottom: 0.5rem;
}

.list-container {
  position: relative;
}

.item-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.item-row {
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

.item-number {
  font-weight: var(--font-weight-semibold);
  color: $primary;
  min-width: 1.5rem;
  text-align: center;
  padding-top: 2px;
}

.item-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.item-meta {
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

.unranked-text {
  font-style: italic;
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
