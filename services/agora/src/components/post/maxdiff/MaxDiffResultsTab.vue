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
        v-if="hasLifecycleTabs && (currentTab === 'Summary' || currentTab === 'Completed')"
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
        v-if="hasLifecycleTabs && (currentTab === 'Summary' || currentTab === 'Canceled')"
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
            <p>{{ hasLifecycleTabs ? t("communityLearnMoreSourceGitHub") : t("communityLearnMoreSourceManual") }}</p>
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
      :conversation-slug-id="conversationSlugId"
      :item-slug-id="expandedItemSlugId"
      :display-content="expandedDisplayContent"
      :external-url="expandedExternalUrl"
    />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import ShortcutBar from "src/components/post/analysis/shortcutBar/ShortcutBar.vue";
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import type { RegisterChildRefreshHandler } from "src/composables/conversation/useConversationParentState";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useTabNavigation } from "src/composables/ui/useTabNavigation";
import type { MaxDiffItem, MaxDiffResultItem } from "src/shared/types/dto";
import type { ExtendedConversationDisplayData, RankingItemDisplayedContent } from "src/shared/types/zod";
import { useLanguageStore } from "src/stores/language";
import { useMaxDiffApi } from "src/utils/api/maxdiff/maxdiff";
import { useMaxDiffLoadQuery } from "src/utils/api/maxdiff/useMaxDiffQueries";
import type { MaxDiffShortcutItem } from "src/utils/component/analysis/maxdiffShortcutBar";
import { maxdiffShortcutItemSchema } from "src/utils/component/analysis/maxdiffShortcutBar";
import { subscribeToContentTranslationUpdated } from "src/utils/translation/contentTranslationEvents";
import { getRankingItemDisplayText } from "src/utils/translation/rankingItemDisplayText";
import { computed, inject, onActivated, onDeactivated, onMounted, onUnmounted, ref, watch } from "vue";
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
  conversationData: ExtendedConversationDisplayData;
  navigateToVotingTab: () => void;
}>();

const { t } = useComponentI18n<MaxDiffResultsTabTranslations>(
  maxDiffResultsTabTranslations,
);

const { getMaxDiffResults, fetchMaxDiffItems } = useMaxDiffApi();
const { displayLanguage, spokenLanguages } = storeToRefs(useLanguageStore());

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

const hasLifecycleTabs = computed(
  () => props.conversationData.metadata.externalSourceConfig !== null,
);

const maxdiffTabItems = computed<MaxDiffShortcutItem[]>(() => {
  const baseItems: MaxDiffShortcutItem[] = ["Summary", "Me", "Results"];
  if (!hasLifecycleTabs.value) {
    return baseItems;
  }
  return [...baseItems, "Completed", "Canceled"];
});

function isLifecycleTab(item: MaxDiffShortcutItem): boolean {
  return item === "Completed" || item === "Canceled";
}

function isTabAvailable(item: MaxDiffShortcutItem): boolean {
  return hasLifecycleTabs.value || !isLifecycleTab(item);
}

if (!isTabAvailable(currentTab.value)) {
  currentTab.value = "Summary";
}

const tabTranslationKeys = {
  Summary: "tabSummary",
  Me: "tabMe",
  Results: "tabResults",
  Completed: "tabCompleted",
  Canceled: "tabCanceled",
} satisfies Record<MaxDiffShortcutItem, keyof MaxDiffResultsTabTranslations>;

function getTabLabel(item: string): string {
  const parsed = maxdiffShortcutItemSchema.safeParse(item);
  if (!parsed.success) {
    return item;
  }

  return t(tabTranslationKeys[parsed.data]);
}

function onTabChange(value: string): void {
  const parsed = maxdiffShortcutItemSchema.safeParse(value);
  if (parsed.success) {
    currentTab.value = isTabAvailable(parsed.data) ? parsed.data : "Summary";
  }
}

// Inject parent refresh handler (same pattern as ConversationAnalysisTab)
const registerChildRefreshHandler = inject<RegisterChildRefreshHandler>(
  "registerChildRefreshHandler",
  () => {
    /* noop */
    return () => {
      /* noop */
    };
  },
);
let unregisterChildRefreshHandler: (() => void) | undefined;
let unregisterTranslationUpdateHandler: (() => void) | undefined;
let translationRefreshTimeout: ReturnType<typeof setTimeout> | undefined;
const isActive = ref(true);

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
const expandedItemSlugId = ref<string | undefined>(undefined);
const expandedDisplayContent = ref<RankingItemDisplayedContent | undefined>(undefined);
const expandedExternalUrl = ref<string | null>(null);

function openStatementDialog({
  itemSlugId,
  displayContent,
  externalUrl,
}: {
  itemSlugId: string;
  displayContent: RankingItemDisplayedContent;
  externalUrl: string | null;
}): void {
  expandedItemSlugId.value = itemSlugId;
  expandedDisplayContent.value = displayContent;
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
    hasLifecycleTabs.value ? keys.github : keys.manual,
  );
  showLifecycleInfoDialog.value = true;
}

function mapApiItemsToListItems({
  apiItems,
}: {
  apiItems: MaxDiffItem[];
}): MaxDiffListItem[] {
  return apiItems.map((item) => ({
    slugId: item.slugId,
    ...getRankingItemDisplayText({
      displayContent: item.displayContent,
    }),
    displayContent: item.displayContent,
    score: item.snapshotScore ?? null,
    externalUrl: item.externalUrl ?? null,
  }));
}

function mapApiResultItemsToListItems({
  apiItems,
}: {
  apiItems: MaxDiffResultItem[];
}): MaxDiffListItem[] {
  return apiItems.map((item) => ({
    slugId: item.itemSlugId,
    ...getRankingItemDisplayText({
      displayContent: item.displayContent,
    }),
    displayContent: item.displayContent,
    score: item.score ?? null,
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
    itemsRef.value = mapApiItemsToListItems({ apiItems: response.data.items });
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
    resultItems.value = mapApiResultItemsToListItems({
      apiItems: response.data.rankings,
    });
  } else {
    hasError.value = true;
  }

  if (showLoading) {
    isInitialLoading.value = false;
  }
}

async function fetchAllLifecycleItems({ showLoading }: { showLoading: boolean }): Promise<void> {
  if (!hasLifecycleTabs.value) {
    return;
  }

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

function queueTranslationRefresh(): void {
  if (translationRefreshTimeout !== undefined) {
    return;
  }

  translationRefreshTimeout = setTimeout(() => {
    translationRefreshTimeout = undefined;
    void handleChildRefresh();
  }, 250);
}

function registerRefreshHandler(): void {
  unregisterChildRefreshHandler?.();
  unregisterChildRefreshHandler = registerChildRefreshHandler(handleChildRefresh);
}

function unregisterRefreshHandler(): void {
  unregisterChildRefreshHandler?.();
  unregisterChildRefreshHandler = undefined;
}

function registerTranslationHandler(): void {
  unregisterTranslationHandler();
  unregisterTranslationUpdateHandler = subscribeToContentTranslationUpdated((data) => {
    if (
      data.subject.kind === "ranking_item" &&
      data.subject.conversationSlugId === conversationSlugId
    ) {
      queueTranslationRefresh();
    }
  });
}

function unregisterTranslationHandler(): void {
  unregisterTranslationUpdateHandler?.();
  unregisterTranslationUpdateHandler = undefined;
  if (translationRefreshTimeout !== undefined) {
    clearTimeout(translationRefreshTimeout);
    translationRefreshTimeout = undefined;
  }
}

// Register on initial setup and re-register on KeepAlive reactivation
// (whichever tab activates last must own the handler)
registerRefreshHandler();
registerTranslationHandler();

const hasInitiallyLoaded = ref(false);

onMounted(async () => {
  await fetchResults({ showLoading: true });
  await fetchAllLifecycleItems({ showLoading: true });
  hasInitiallyLoaded.value = true;
});

// Silently refresh data when reactivated from KeepAlive (tab switch back)
// Shows stale cached data immediately, then updates in background
onActivated(async () => {
  isActive.value = true;
  registerRefreshHandler();
  registerTranslationHandler();
  if (!hasInitiallyLoaded.value) return;
  await handleChildRefresh();
});

onDeactivated(() => {
  isActive.value = false;
  unregisterRefreshHandler();
  unregisterTranslationHandler();
});

onUnmounted(() => {
  unregisterRefreshHandler();
  unregisterTranslationHandler();
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

watch(
  computed(() => `${displayLanguage.value}:${spokenLanguages.value.join(",")}`),
  async () => {
    if (!isActive.value) return;
    await handleChildRefresh();
  },
);
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
