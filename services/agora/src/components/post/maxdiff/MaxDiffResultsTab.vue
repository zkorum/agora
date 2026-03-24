<template>
  <div class="container flexStyle">
    <ShortcutBar
      :model-value="currentTab"
      :items="maxdiffTabItems"
      :get-label="getTabLabel"
      :on-same-tab-click="handleSameTabClick"
      @update:model-value="onTabChange"
    />

    <!-- Loading (initial results fetch) -->
    <PageLoadingSpinner v-if="isInitialLoading" />

    <!-- Error -->
    <div v-else-if="hasError" class="info-message">
      {{ t("loadingError") }}
    </div>

    <template v-else>
      <!-- Rankings section -->
      <div
        v-if="currentTab === 'Summary' || currentTab === 'Results'"
        class="tabComponent"
      >
        <MaxDiffItemListSection
          :section-title="t('title')"
          :subtitle="t('subtitle')"
          :items="resultItems"
          :is-loading="false"
          :no-items-message="t('noResults')"
          :score-label="t('score')"
          :compact-mode="currentTab === 'Summary'"
          :on-click-item="openStatementDialog"
          :on-switch-tab="() => switchToTab('Results')"
          :on-learn-more="() => (showInfoDialog = true)"
        />
      </div>

      <!-- Active items -->
      <div
        v-if="currentTab === 'Summary' || currentTab === 'Active'"
        class="tabComponent"
      >
        <MaxDiffItemListSection
          :section-title="t('tabActive')"
          :subtitle="null"
          :items="activeItems"
          :is-loading="isActiveLoading"
          :no-items-message="t('noItems')"
          :score-label="t('score')"
          :compact-mode="currentTab === 'Summary'"
          :on-click-item="openStatementDialog"
          :on-switch-tab="() => switchToTab('Active')"
          :on-learn-more="() => openLifecycleLearnMore('active')"
        />
      </div>

      <!-- Completed items -->
      <div
        v-if="currentTab === 'Summary' || currentTab === 'Completed'"
        class="tabComponent"
      >
        <MaxDiffItemListSection
          :section-title="t('tabCompleted')"
          :subtitle="null"
          :items="completedItems"
          :is-loading="isCompletedLoading"
          :no-items-message="t('noItems')"
          :score-label="t('score')"
          :compact-mode="currentTab === 'Summary'"
          :on-click-item="openStatementDialog"
          :on-switch-tab="() => switchToTab('Completed')"
          :on-learn-more="() => openLifecycleLearnMore('completed')"
        />
      </div>

      <!-- Canceled items -->
      <div
        v-if="currentTab === 'Summary' || currentTab === 'Canceled'"
        class="tabComponent"
      >
        <MaxDiffItemListSection
          :section-title="t('tabCanceled')"
          :subtitle="null"
          :items="canceledItems"
          :is-loading="isCanceledLoading"
          :no-items-message="t('noItems')"
          :score-label="t('score')"
          :compact-mode="currentTab === 'Summary'"
          :on-click-item="openStatementDialog"
          :on-switch-tab="() => switchToTab('Canceled')"
          :on-learn-more="() => openLifecycleLearnMore('canceled')"
        />
      </div>
    </template>

    <!-- Learn more dialog -->
    <q-dialog v-model="showInfoDialog" position="bottom">
      <q-card class="learn-more-dialog">
        <q-card-section>
          <div class="dialog-title">Scoring Methodology</div>
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
            ·
            <a
              href="https://en.wikipedia.org/wiki/Bradley%E2%80%93Terry_model"
              target="_blank"
              rel="noopener noreferrer"
              class="learn-more-link"
            >Bradley-Terry Model (Wikipedia)</a>
          </p>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Lifecycle learn-more dialog -->
    <q-dialog v-model="showLifecycleInfoDialog" position="bottom">
      <q-card class="learn-more-dialog">
        <q-card-section class="dialog-content">
          <p>{{ lifecycleInfoContent }}</p>
        </q-card-section>
      </q-card>
    </q-dialog>

    <MaxDiffStatementDialog
      v-model="showStatementDialog"
      :title="expandedTitle"
      :html-body="expandedContent"
      :external-url="expandedExternalUrl"
    />
  </div>
</template>

<script setup lang="ts">
import ShortcutBar from "src/components/post/analysis/shortcutBar/ShortcutBar.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useTabNavigation } from "src/composables/ui/useTabNavigation";
import type { ExtendedConversation } from "src/shared/types/zod";
import { useMaxDiffApi } from "src/utils/api/maxdiff/maxdiff";
import type { MaxDiffShortcutItem } from "src/utils/component/analysis/maxdiffShortcutBar";
import { maxdiffShortcutItemSchema } from "src/utils/component/analysis/maxdiffShortcutBar";
import { onMounted, ref, watch } from "vue";

import type { MaxDiffListItem } from "./MaxDiffItemListSection.vue";
import MaxDiffItemListSection from "./MaxDiffItemListSection.vue";
import {
  type MaxDiffResultsTabTranslations,
  maxDiffResultsTabTranslations,
} from "./MaxDiffResultsTab.i18n";
import MaxDiffStatementDialog from "./MaxDiffStatementDialog.vue";

const props = defineProps<{
  conversationData: ExtendedConversation;
}>();

const { t } = useComponentI18n<MaxDiffResultsTabTranslations>(
  maxDiffResultsTabTranslations,
);

const { getMaxDiffResults, fetchMaxDiffItems } = useMaxDiffApi();

const { currentTab, handleSameTabClick, switchToTab } = useTabNavigation({
  schema: maxdiffShortcutItemSchema,
  defaultTab: "Summary",
});

const maxdiffTabItems: MaxDiffShortcutItem[] = [
  "Summary",
  "Results",
  "Active",
  "Completed",
  "Canceled",
];

const tabLabelMap: Record<string, string> = {
  Summary: t("tabSummary"),
  Results: t("tabResults"),
  Active: t("tabActive"),
  Completed: t("tabCompleted"),
  Canceled: t("tabCanceled"),
};

function getTabLabel(item: string): string {
  return tabLabelMap[item] ?? item;
}

function onTabChange(value: string): void {
  const parsed = maxdiffShortcutItemSchema.safeParse(value);
  if (parsed.success) {
    currentTab.value = parsed.data;
  }
}

const isGitHubLinked =
  props.conversationData.metadata.externalSourceConfig !== null;

const conversationSlugId =
  props.conversationData.metadata.conversationSlugId;

// Results data
const isInitialLoading = ref(true);
const hasError = ref(false);
const resultItems = ref<MaxDiffListItem[]>([]);

// Lifecycle data
const activeItems = ref<MaxDiffListItem[]>([]);
const isActiveLoading = ref(true);
const completedItems = ref<MaxDiffListItem[]>([]);
const isCompletedLoading = ref(true);
const canceledItems = ref<MaxDiffListItem[]>([]);
const isCanceledLoading = ref(true);

// Dialog state
const showInfoDialog = ref(false);
const showLifecycleInfoDialog = ref(false);
const lifecycleInfoContent = ref("");
const showStatementDialog = ref(false);
const expandedTitle = ref("");
const expandedContent = ref("");
const expandedExternalUrl = ref<string | null>(null);

function openStatementDialog({
  title,
  body,
  externalUrl,
}: {
  title: string;
  body: string | null;
  externalUrl: string | null;
}): void {
  expandedTitle.value = title;
  expandedContent.value = body ?? "";
  expandedExternalUrl.value = externalUrl;
  showStatementDialog.value = true;
}

function openLifecycleLearnMore(
  lifecycle: "active" | "completed" | "canceled",
): void {
  const keyMap: Record<
    "active" | "completed" | "canceled",
    {
      manual: keyof MaxDiffResultsTabTranslations;
      github: keyof MaxDiffResultsTabTranslations;
    }
  > = {
    active: {
      manual: "activeLearnMoreManual",
      github: "activeLearnMoreGitHub",
    },
    completed: {
      manual: "completedLearnMoreManual",
      github: "completedLearnMoreGitHub",
    },
    canceled: {
      manual: "canceledLearnMoreManual",
      github: "canceledLearnMoreGitHub",
    },
  };

  const keys = keyMap[lifecycle];
  lifecycleInfoContent.value = t(
    isGitHubLinked ? keys.github : keys.manual,
  );
  showLifecycleInfoDialog.value = true;
}

function mapApiItemsToListItems(
  apiItems: Array<{
    slugId: string;
    title: string;
    body: string | null;
    snapshotScore: number | null;
    externalUrl: string | null;
  }>,
): MaxDiffListItem[] {
  return apiItems.map((item) => ({
    slugId: item.slugId,
    title: item.title,
    body: item.body ?? null,
    score: item.snapshotScore ?? null,
    externalUrl: item.externalUrl ?? null,
  }));
}

async function fetchLifecycleItems({
  lifecycle,
  itemsRef,
  loadingRef,
}: {
  lifecycle: "active" | "completed" | "canceled";
  itemsRef: typeof activeItems;
  loadingRef: typeof isActiveLoading;
}): Promise<void> {
  loadingRef.value = true;

  const response = await fetchMaxDiffItems({
    conversationSlugId,
    lifecycleFilter: lifecycle,
  });

  if (response.status === "success") {
    itemsRef.value = mapApiItemsToListItems(response.data.items);
  }

  loadingRef.value = false;
}

onMounted(async () => {
  isInitialLoading.value = true;
  hasError.value = false;

  const response = await getMaxDiffResults({ conversationSlugId });

  if (response.status === "success") {
    resultItems.value = response.data.rankings.map((r) => ({
      slugId: r.itemSlugId,
      title: r.title,
      body: r.body ?? null,
      score: r.score,
      externalUrl: r.externalUrl ?? null,
    }));
  } else {
    hasError.value = true;
  }

  isInitialLoading.value = false;

  await Promise.all([
    fetchLifecycleItems({ lifecycle: "active", itemsRef: activeItems, loadingRef: isActiveLoading }),
    fetchLifecycleItems({ lifecycle: "completed", itemsRef: completedItems, loadingRef: isCompletedLoading }),
    fetchLifecycleItems({ lifecycle: "canceled", itemsRef: canceledItems, loadingRef: isCanceledLoading }),
  ]);
});

watch(currentTab, async (newTab, oldTab) => {
  if (oldTab === "Summary" && newTab !== "Summary") {
    const tabLifecycleMap: Partial<Record<MaxDiffShortcutItem, {
      lifecycle: "active" | "completed" | "canceled";
      itemsRef: typeof activeItems;
      loadingRef: typeof isActiveLoading;
    }>> = {
      Active: { lifecycle: "active", itemsRef: activeItems, loadingRef: isActiveLoading },
      Completed: { lifecycle: "completed", itemsRef: completedItems, loadingRef: isCompletedLoading },
      Canceled: { lifecycle: "canceled", itemsRef: canceledItems, loadingRef: isCanceledLoading },
    };

    const config = tabLifecycleMap[newTab];
    if (config !== undefined) {
      await fetchLifecycleItems(config);
    }
  }
});
</script>

<style scoped lang="scss">
.container {
  background-color: white;
  padding: 1rem;
  border-radius: 25px;
  border-color: #e9e9f1;
  border-width: 1px;
  margin-bottom: 5rem;
  color: #333238;
}

.flexStyle {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.tabComponent {
  border-radius: 12px;
  padding: 0.5rem;
}

.info-message {
  text-align: center;
  color: $color-text-weak;
  padding: 2rem 1rem;
  font-size: 0.95rem;
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
