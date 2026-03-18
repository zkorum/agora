<template>
  <AnalysisSectionWrapper>
    <template #header>
      <AnalysisTitleHeader :title="sectionTitle" :show-star-in-title="false">
        <template #action-button>
          <AnalysisActionButton
            :type="compactMode ? 'viewMore' : 'learnMore'"
            @action-click="compactMode ? props.onSwitchTab() : props.onLearnMore()"
          />
        </template>
      </AnalysisTitleHeader>
    </template>

    <template #body>
      <PageLoadingSpinner v-if="isLoading" />

      <div v-else-if="items.length === 0" class="info-message">
        {{ t("noItems") }}
      </div>

      <div v-else class="list-container">
        <ol class="item-list">
          <li
            v-for="(item, index) in displayItems"
            :key="item.slugId"
            class="item-row"
            @click="props.onClickItem({ title: item.title, body: null, externalUrl: item.externalUrl })"
          >
            <span class="item-number">{{ index + 1 }}</span>
            <div class="item-details">
              <ZKHtmlContent
                class="item-content"
                :html-body="item.title"
                :compact-mode="true"
                :enable-links="false"
              />
              <div v-if="item.snapshotScore !== null" class="item-meta">
                <div class="score-bar-container">
                  <div class="score-bar">
                    <div
                      class="score-fill"
                      :style="{ width: `${item.snapshotScore * 100}%` }"
                    ></div>
                  </div>
                </div>
                <span class="score-text">
                  {{ t("score").replace("{score}", (item.snapshotScore * 100).toFixed(0) + "%") }}
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
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import ZKHtmlContent from "src/components/ui-library/ZKHtmlContent.vue";
import { useMaxDiffApi } from "src/utils/api/maxdiff/maxdiff";
import { computed, onMounted, ref, watch } from "vue";

import type { MaxDiffResultsTabTranslations } from "./MaxDiffResultsTab.i18n";

interface ItemDisplay {
  slugId: string;
  title: string;
  snapshotScore: number | null;
  externalUrl: string | null;
}

const props = defineProps<{
  conversationSlugId: string;
  lifecycle: "active" | "completed" | "canceled";
  compactMode: boolean;
  t: (key: keyof MaxDiffResultsTabTranslations) => string;
  onClickItem: (item: { title: string; body: string | null; externalUrl: string | null }) => void;
  onSwitchTab: () => void;
  onLearnMore: () => void;
}>();

const { fetchMaxDiffItems } = useMaxDiffApi();

const COMPACT_LIMIT = 3;

const isLoading = ref(true);
const items = ref<ItemDisplay[]>([]);

const sectionTitle = computed(() => {
  const titleMap: Record<string, keyof MaxDiffResultsTabTranslations> = {
    active: "tabActive",
    completed: "tabCompleted",
    canceled: "tabCanceled",
  };
  return props.t(titleMap[props.lifecycle] ?? "tabActive");
});

const displayItems = computed(() =>
  props.compactMode ? items.value.slice(0, COMPACT_LIMIT) : items.value,
);

const hasMore = computed(() => items.value.length > COMPACT_LIMIT);

async function fetchItems(): Promise<void> {
  isLoading.value = true;

  const response = await fetchMaxDiffItems({
    conversationSlugId: props.conversationSlugId,
    lifecycleFilter: props.lifecycle,
  });

  if (response.status === "success") {
    items.value = response.data.items.map((item) => ({
      slugId: item.slugId,
      title: item.title,
      snapshotScore: item.snapshotScore ?? null,
      externalUrl: item.externalUrl ?? null,
    }));
  }

  isLoading.value = false;
}

onMounted(async () => {
  await fetchItems();
});

watch(
  () => props.compactMode,
  async (isCompact, wasCompact) => {
    if (wasCompact && !isCompact) {
      await fetchItems();
    }
  },
);
</script>

<style scoped lang="scss">
.info-message {
  text-align: center;
  color: $color-text-weak;
  padding: 1rem;
  font-size: 0.9rem;
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
