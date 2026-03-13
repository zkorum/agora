<template>
  <div class="maxdiff-results-container">
    <!-- Loading -->
    <div v-if="isLoading" class="info-message">
      <q-spinner size="2rem" />
    </div>

    <!-- Error -->
    <div v-else-if="hasError" class="info-message">
      {{ t("loadingError") }}
    </div>

    <!-- No results yet -->
    <div v-else-if="rankings.length === 0" class="info-message">
      {{ t("noResults") }}
    </div>

    <!-- Results list -->
    <div v-else class="results-section">
      <div class="section-header">{{ t("title") }}</div>
      <div class="participant-count">
        {{ t("participants").replace("{count}", totalParticipants.toString()) }}
      </div>

      <div class="method-row">
        <span class="method-subtitle">{{ t("subtitle") }}</span>
        <button class="learn-more-button" @click="showInfoDialog = true">
          {{ t("learnMore") }}
        </button>
      </div>

      <q-dialog v-model="showInfoDialog" position="bottom">
        <q-card class="learn-more-dialog">
          <q-card-section>
            <div class="dialog-title">Best-Worst Scaling (MaxDiff)</div>
          </q-card-section>
          <q-card-section class="dialog-content">
            <p>{{ t("learnMoreMethod") }}</p>
            <p>{{ t("learnMoreHow") }}</p>
            <p>{{ t("learnMoreWhy") }}</p>
            <p class="learn-more-reference">
              {{ t("learnMoreReference") }}
              <a
                href="https://en.wikipedia.org/wiki/Best%E2%80%93worst_scaling"
                target="_blank"
                rel="noopener noreferrer"
                class="learn-more-link"
              >Best-Worst Scaling (Wikipedia)</a>
            </p>
          </q-card-section>
        </q-card>
      </q-dialog>

      <ol class="results-list">
        <li
          v-for="(item, index) in rankings"
          :key="item.opinionSlugId"
          class="result-item"
        >
          <span class="rank-number">{{ index + 1 }}</span>
          <div class="result-details">
            <ZKHtmlContent
              class="result-content"
              :html-body="item.opinionContent"
              :compact-mode="false"
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
    </div>
  </div>
</template>

<script setup lang="ts">
import ZKHtmlContent from "src/components/ui-library/ZKHtmlContent.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { ExtendedConversation } from "src/shared/types/zod";
import { useMaxDiffApi } from "src/utils/api/maxdiff/maxdiff";
import { computed, onMounted, ref } from "vue";

import {
  type MaxDiffResultsTabTranslations,
  maxDiffResultsTabTranslations,
} from "./MaxDiffResultsTab.i18n";

const props = defineProps<{
  conversationData: ExtendedConversation;
}>();

const { t } = useComponentI18n<MaxDiffResultsTabTranslations>(
  maxDiffResultsTabTranslations
);

const { getMaxDiffResults } = useMaxDiffApi();

interface RankingItem {
  opinionSlugId: string;
  opinionContent: string;
  avgRank: number;
  score: number;
  participantCount: number;
}

const isLoading = ref(true);
const hasError = ref(false);
const rankings = ref<RankingItem[]>([]);
const showInfoDialog = ref(false);

const totalParticipants = computed(() => {
  if (rankings.value.length === 0) return 0;
  return Math.max(...rankings.value.map((r) => r.participantCount));
});

onMounted(async () => {
  await fetchResults();
});

async function fetchResults(): Promise<void> {
  isLoading.value = true;
  hasError.value = false;

  const response = await getMaxDiffResults({
    conversationSlugId: props.conversationData.metadata.conversationSlugId,
  });

  if (response.status === "success") {
    rankings.value = response.data.rankings.map((r) => ({
      opinionSlugId: r.opinionSlugId,
      opinionContent: r.opinionContent,
      avgRank: r.avgRank,
      score: r.score,
      participantCount: r.participantCount,
    }));
  } else {
    hasError.value = true;
  }

  isLoading.value = false;
}
</script>

<style scoped lang="scss">
.maxdiff-results-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background-color: white;
  padding: 1rem;
  border-radius: 25px;
  border: 1px solid #e9e9f1;
}

.info-message {
  text-align: center;
  color: $color-text-weak;
  padding: 2rem 1rem;
  font-size: 0.95rem;
}

.results-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-header {
  font-size: 1.1rem;
  font-weight: var(--font-weight-semibold);
  color: $color-text-strong;
}

.participant-count {
  font-size: 0.85rem;
  color: $color-text-weak;
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

.method-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.method-subtitle {
  font-size: 0.85rem;
  color: $color-text-weak;
}

.learn-more-button {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
  font-weight: var(--font-weight-medium);
  color: $color-text-weak;
  border-radius: 4px;
  transition: background-color 0.2s;
  white-space: nowrap;
  height: 2rem;
  display: flex;
  align-items: center;
  font-family: inherit;

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
}

.learn-more-dialog {
  width: 100%;
  max-width: 600px;
  border-radius: 16px 16px 0 0;
}

.dialog-title {
  font-size: 1.1rem;
  font-weight: var(--font-weight-semibold);
  color: $color-text-strong;
}

.dialog-content {
  font-size: 0.9rem;
  line-height: 1.5;
  color: $color-text-weak;

  p {
    margin: 0 0 0.75rem;
  }
}

.learn-more-reference {
  font-size: 0.85rem;
}

.learn-more-link {
  color: $primary;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}
</style>
