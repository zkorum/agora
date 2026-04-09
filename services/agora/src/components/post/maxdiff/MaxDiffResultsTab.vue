<template>
  <div class="container flexStyle">
    <ShortcutBar
      :model-value="currentTab"
      :items="maxdiffTabItems"
      :get-label="getTabLabel"
      :get-route="getMaxDiffTabRoute"
      :on-same-tab-click="handleSameTabClick"
      @update:model-value="onTabChange"
    />

    <!-- Loading (initial results fetch) -->
    <PageLoadingSpinner v-if="isInitialLoading" />

    <!-- Error -->
    <ErrorRetryBlock
      v-else-if="hasError"
      :title="t('loadingError')"
      :retry-label="t('retryButton')"
      @retry="retryFetchResults"
    />

    <template v-else>
      <!-- Me section (above community ranking in Summary) -->
      <div
        v-if="currentTab === 'Summary' || currentTab === 'Me'"
        class="tabComponent"
      >
        <MaxDiffMeSection
          :load-data="loadQuery.data.value"
          :all-items="resultItems"
          :compact-mode="currentTab === 'Summary'"
          :on-click-item="openStatementDialog"
          :on-switch-tab="() => onTabChange('Me')"
          :on-learn-more="() => (learnMoreContext = 'me')"
          :navigate-to-voting-tab="props.navigateToVotingTab"
        />
      </div>

      <!-- Community Rankings -->
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
          :on-switch-tab="() => onTabChange('Results')"
          :on-learn-more="() => (learnMoreContext = 'community')"
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
          :on-switch-tab="() => onTabChange('Completed')"
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
          :on-switch-tab="() => onTabChange('Canceled')"
          :on-learn-more="() => openLifecycleLearnMore('canceled')"
        />
      </div>
    </template>

    <!-- Learn more dialog -->
    <q-dialog v-model="showInfoDialog" position="bottom">
      <ZKBottomDialogContainer :title="learnMoreContext === 'community' ? t('title') : t('meTitle')">
        <div class="learn-more-content">
          <template v-if="learnMoreContext === 'community'">
            <p>{{ t("communityLearnMoreHow") }}</p>
            <p>{{ t("communityLearnMoreCocm") }}</p>
            <p>{{ t("communityLearnMoreDiversity") }}</p>
            <p>{{ isGitHubLinked ? t("communityLearnMoreSourceGitHub") : t("communityLearnMoreSourceManual") }}</p>
            <p class="learn-more-reference">
              {{ t("communityLearnMoreReference") }}
              <a
                href="https://github.com/tournesol-app/tournesol/tree/main/solidago"
                target="_blank"
                rel="noopener noreferrer"
                class="learn-more-link"
              >Solidago</a>
              ·
              <a
                href="https://en.wikipedia.org/wiki/Best%E2%80%93worst_scaling"
                target="_blank"
                rel="noopener noreferrer"
                class="learn-more-link"
              >Best-Worst Scaling</a>
              ·
              <a
                href="https://ssrn.com/abstract=4311507"
                target="_blank"
                rel="noopener noreferrer"
                class="learn-more-link"
              >COCM</a>
            </p>
          </template>
          <template v-else>
            <p>{{ t("meLearnMorePersonal") }}</p>
            <p>{{ t("meLearnMoreCounts") }}</p>
          </template>
        </div>
      </ZKBottomDialogContainer>
    </q-dialog>

    <!-- Lifecycle learn-more dialog -->
    <q-dialog v-model="showLifecycleInfoDialog" position="bottom">
      <ZKBottomDialogContainer :title="lifecycleInfoTitle">
        <div class="learn-more-content">
          <p>{{ lifecycleInfoContent }}</p>
        </div>
      </ZKBottomDialogContainer>
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
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useTabNavigation } from "src/composables/ui/useTabNavigation";
import type { ExtendedConversation } from "src/shared/types/zod";
import { useMaxDiffApi } from "src/utils/api/maxdiff/maxdiff";
import { useMaxDiffLoadQuery } from "src/utils/api/maxdiff/useMaxDiffQueries";
import type { MaxDiffShortcutItem } from "src/utils/component/analysis/maxdiffShortcutBar";
import { maxdiffShortcutItemSchema } from "src/utils/component/analysis/maxdiffShortcutBar";
import { computed, inject, onActivated, onMounted, ref, watch } from "vue";
import type { RouteLocationRaw } from "vue-router";
import { useRoute } from "vue-router";

import type { MaxDiffListItem } from "./MaxDiffItemListSection.vue";
import MaxDiffItemListSection from "./MaxDiffItemListSection.vue";
import MaxDiffMeSection from "./MaxDiffMeSection.vue";
import {
  type MaxDiffResultsTabTranslations,
  maxDiffResultsTabTranslations,
} from "./MaxDiffResultsTab.i18n";
import MaxDiffStatementDialog from "./MaxDiffStatementDialog.vue";

const props = defineProps<{
  conversationData: ExtendedConversation;
  navigateToVotingTab: () => void;
}>();

const { t } = useComponentI18n<MaxDiffResultsTabTranslations>(
  maxDiffResultsTabTranslations,
);

const { getMaxDiffResults, fetchMaxDiffItems } = useMaxDiffApi();

const route = useRoute();

const { currentTab, handleSameTabClick } = useTabNavigation({
  schema: maxdiffShortcutItemSchema,
  defaultTab: "Summary",
});

function getMaxDiffTabRoute(item: string): RouteLocationRaw {
  if (item === "Summary") {
    return { path: route.path };
  }
  return { path: route.path, query: { tab: item } };
}

const maxdiffTabItems: MaxDiffShortcutItem[] = [
  "Summary",
  "Me",
  "Results",
  "Completed",
  "Canceled",
];

const tabLabelMap: Record<string, string> = {
  Summary: t("tabSummary"),
  Me: t("tabMe"),
  Results: t("tabResults"),
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

// Inject parent refresh handler (same pattern as ConversationAnalysisTab)
const registerChildRefreshHandler = inject<
  (handler: () => Promise<void>) => void
>(
  "registerChildRefreshHandler",
  () => {
    /* noop */
  },
);

const isGitHubLinked =
  props.conversationData.metadata.externalSourceConfig !== null;

const conversationSlugId =
  props.conversationData.metadata.conversationSlugId;

// Results data
const isInitialLoading = ref(true);
const hasError = ref(false);
const resultItems = ref<MaxDiffListItem[]>([]);

// Me tab: user's personal ranking (data passed to MaxDiffMeSection)
const loadQuery = useMaxDiffLoadQuery({
  conversationSlugId,
  enabled: true,
});

// Lifecycle data
const completedItems = ref<MaxDiffListItem[]>([]);
const isCompletedLoading = ref(true);
const canceledItems = ref<MaxDiffListItem[]>([]);
const isCanceledLoading = ref(true);

// Dialog state
const learnMoreContext = ref<"community" | "me" | null>(null);
const showInfoDialog = computed({
  get: () => learnMoreContext.value !== null,
  set: (val: boolean) => {
    if (!val) learnMoreContext.value = null;
  },
});
const showLifecycleInfoDialog = ref(false);
const lifecycleInfoTitle = ref("");
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
  lifecycle: "completed" | "canceled",
): void {
  const keyMap: Record<
    "completed" | "canceled",
    {
      title: keyof MaxDiffResultsTabTranslations;
      manual: keyof MaxDiffResultsTabTranslations;
      github: keyof MaxDiffResultsTabTranslations;
    }
  > = {
    completed: {
      title: "tabCompleted",
      manual: "completedLearnMoreManual",
      github: "completedLearnMoreGitHub",
    },
    canceled: {
      title: "tabCanceled",
      manual: "canceledLearnMoreManual",
      github: "canceledLearnMoreGitHub",
    },
  };

  const keys = keyMap[lifecycle];
  lifecycleInfoTitle.value = t(keys.title);
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
  showLoading,
}: {
  lifecycle: "completed" | "canceled";
  itemsRef: typeof completedItems;
  loadingRef: typeof isCompletedLoading;
  showLoading: boolean;
}): Promise<void> {
  if (showLoading) {
    loadingRef.value = true;
  }

  const response = await fetchMaxDiffItems({
    conversationSlugId,
    lifecycleFilter: lifecycle,
  });

  if (response.status === "success") {
    itemsRef.value = mapApiItemsToListItems(response.data.items);
  }

  if (showLoading) {
    loadingRef.value = false;
  }
}

function retryFetchResults(): void {
  void fetchResults({ showLoading: true });
}

async function fetchResults({ showLoading }: { showLoading: boolean }): Promise<void> {
  if (showLoading) {
    isInitialLoading.value = true;
  }
  hasError.value = false;

  const response = await getMaxDiffResults({ conversationSlugId });

  if (response.status === "success") {
    resultItems.value = response.data.rankings.map((r) => ({
      slugId: r.itemSlugId,
      title: r.title,
      body: r.body ?? null,
      score: r.score ?? null,
      externalUrl: r.externalUrl ?? null,
    }));
  } else {
    hasError.value = true;
  }

  if (showLoading) {
    isInitialLoading.value = false;
  }
}

async function fetchAllLifecycleItems({ showLoading }: { showLoading: boolean }): Promise<void> {
  await Promise.all([
    fetchLifecycleItems({ lifecycle: "completed", itemsRef: completedItems, loadingRef: isCompletedLoading, showLoading }),
    fetchLifecycleItems({ lifecycle: "canceled", itemsRef: canceledItems, loadingRef: isCanceledLoading, showLoading }),
  ]);
}

// Pull-to-refresh handler: silently refetch without toggling loading spinners
// (the pull-to-refresh spinner already indicates activity)
async function handleChildRefresh(): Promise<void> {
  await fetchResults({ showLoading: false });
  await Promise.all([
    loadQuery.refetch(),
    fetchAllLifecycleItems({ showLoading: false }),
  ]);
}

// Register on initial setup and re-register on KeepAlive reactivation
// (whichever tab activates last must own the handler)
registerChildRefreshHandler(handleChildRefresh);

const hasInitiallyLoaded = ref(false);

onMounted(async () => {
  await fetchResults({ showLoading: true });
  await fetchAllLifecycleItems({ showLoading: true });
  hasInitiallyLoaded.value = true;
});

// Silently refresh data when reactivated from KeepAlive (tab switch back)
// Shows stale cached data immediately, then updates in background
onActivated(async () => {
  registerChildRefreshHandler(handleChildRefresh);
  if (!hasInitiallyLoaded.value) return;
  await handleChildRefresh();
});

watch(currentTab, async (newTab, oldTab) => {
  if (oldTab === "Summary" && newTab !== "Summary") {
    const tabLifecycleMap: Partial<Record<MaxDiffShortcutItem, {
      lifecycle: "completed" | "canceled";
      itemsRef: typeof completedItems;
      loadingRef: typeof isCompletedLoading;
    }>> = {
      Completed: { lifecycle: "completed", itemsRef: completedItems, loadingRef: isCompletedLoading },
      Canceled: { lifecycle: "canceled", itemsRef: canceledItems, loadingRef: isCanceledLoading },
    };

    const config = tabLifecycleMap[newTab];
    if (config !== undefined) {
      await fetchLifecycleItems({ ...config, showLoading: true });
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

.learn-more-content {
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
