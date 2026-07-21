<template>
  <Teleport v-if="isActive" to="#page-header">
    <StandardMenuBar title="MaxDiff translation test" :center-content="true" />
  </Teleport>

  <div class="container">
    <q-card flat bordered class="section-card">
      <q-card-section>
        <div class="section-title">Controls</div>
        <p class="section-copy">
          Use this page to test per-item ranking translation display. Complete the
          background translation and verify the active voting cards stay frozen
          until you move to another candidate set.
        </p>
        <div class="control-row">
          <q-btn
            unelevated
            color="primary"
            :label="translationCompleted ? 'Translation completed' : 'Complete background translation'"
            :disable="translationCompleted"
            @click="completeTranslation"
          />
          <q-btn
            flat
            color="primary"
            label="Next / undo candidate set"
            @click="refreshCandidateSet"
          />
          <q-btn flat label="Reset" @click="resetScenario" />
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered class="section-card">
      <q-card-section>
        <div class="section-title">Active MaxDiff round snapshot</div>
        <p class="section-copy">
          These cards use the same snapshot helper as active MaxDiff voting. They
          do not change when background translation completes; they refresh when
          the candidate set changes.
        </p>
        <div class="candidate-grid">
          <button
            v-for="item in candidateSnapshot"
            :key="item.slugId"
            class="candidate-card"
            type="button"
            @click="openDialog(item.slugId)"
          >
            <ZKHtmlContent
              :html-body="item.title"
              :compact-mode="false"
              :enable-links="false"
              content-role="title"
            />
            <div v-if="item.body !== null" class="candidate-body">
              <ZKHtmlContent
                :html-body="item.body"
                :compact-mode="true"
                :enable-links="false"
              />
            </div>
          </button>
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered class="section-card">
      <q-card-section>
        <div class="section-title">Live results list</div>
        <p class="section-copy">
          This list intentionally updates immediately. Results are read-only, so
          they can show the current translated display content.
        </p>
        <MaxDiffItemListSection
          conversation-slug-id="dev-maxdiff-translation"
          section-title="Community ranking"
          subtitle="Read-only list should update immediately when translation completes."
          :items="resultItems"
          :is-loading="false"
          no-items-message="No items"
          score-label="{score}"
          :compact-mode="false"
          :on-click-item="({ itemSlugId }) => openDialog(itemSlugId)"
          :on-switch-tab="noop"
          :on-learn-more="noop"
        />
      </q-card-section>
    </q-card>

    <MaxDiffStatementDialog
      v-model="showDialog"
      conversation-slug-id="dev-maxdiff-translation"
      :item-slug-id="dialogItemSlugId"
      :display-content="dialogDisplayContent"
      :external-url="null"
    />
  </div>
</template>

<script setup lang="ts">
import { StandardMenuBar } from "src/components/navigation/header/variants";
import type { MaxDiffListItem } from "src/components/post/maxdiff/MaxDiffItemListSection.vue";
import MaxDiffItemListSection from "src/components/post/maxdiff/MaxDiffItemListSection.vue";
import MaxDiffStatementDialog from "src/components/post/maxdiff/MaxDiffStatementDialog.vue";
import ZKHtmlContent from "src/components/ui-library/ZKHtmlContent.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import type { RankingItemDisplayedContent } from "src/shared/types/zod";
import {
  createMaxDiffCandidateDisplaySnapshot,
  type MaxDiffCandidateDisplayItem,
} from "src/utils/maxdiffCandidateDisplay";
import { getRankingItemDisplayText } from "src/utils/translation/rankingItemDisplayText";
import { computed, ref } from "vue";

const { isActive } = usePageLayout({
  enableFooter: false,
  reducedWidth: true,
  addBottomPadding: true,
});

const translationCompleted = ref(false);
const showDialog = ref(false);
const dialogItemSlugId = ref<string | undefined>(undefined);

const candidateSlugIds = ["item-a", "item-b", "item-c"] as const;

const liveItems = computed<MaxDiffCandidateDisplayItem[]>(() =>
  candidateSlugIds.map((slugId, index) => {
    const displayContent = getDisplayContent({ slugId });
    const displayText = getRankingItemDisplayText({ displayContent });
    return {
      slugId,
      title: displayText.title,
      body: displayText.body,
      displayContent,
      externalUrl: index === 2 ? "https://github.com/zkorum/agora" : null,
    };
  })
);

const liveItemBySlugId = computed(() => {
  const map = new Map<string, MaxDiffCandidateDisplayItem>();
  for (const item of liveItems.value) {
    map.set(item.slugId, item);
  }
  return map;
});

const candidateSnapshot = ref<MaxDiffCandidateDisplayItem[]>([]);

const resultItems = computed<MaxDiffListItem[]>(() =>
  liveItems.value.map((item, index) => ({
    ...item,
    score: 0.92 - index * 0.2,
  }))
);

const dialogDisplayContent = computed(
  () =>
    dialogItemSlugId.value === undefined
      ? undefined
      : liveItemBySlugId.value.get(dialogItemSlugId.value)?.displayContent
);

function getDisplayContent({
  slugId,
}: {
  slugId: (typeof candidateSlugIds)[number];
}): RankingItemDisplayedContent {
  const sourceVersionBySlugId = {
    "item-a": "00000000-0000-4000-8000-000000000101",
    "item-b": "00000000-0000-4000-8000-000000000102",
    "item-c": "00000000-0000-4000-8000-000000000103",
  } satisfies Record<(typeof candidateSlugIds)[number], string>;
  const originalTitleBySlugId = {
    "item-a": "Fund neighborhood tree planting",
    "item-b": "Repair the cycling bridge",
    "item-c": "Open the library on Sundays",
  } satisfies Record<(typeof candidateSlugIds)[number], string>;
  const translatedTitleBySlugId = {
    "item-a": "FR - Financer les arbres du quartier",
    "item-b": "FR - Reparations du pont velo",
    "item-c": "FR - Ouvrir la bibliotheque le dimanche",
  } satisfies Record<(typeof candidateSlugIds)[number], string>;

  if (translationCompleted.value) {
    return {
      sourceVersion: sourceVersionBySlugId[slugId],
      status: "available",
      mode: "translated",
      content: {
        title: translatedTitleBySlugId[slugId],
        bodyHtml: `<p>Translated detail for ${slugId}.</p>`,
      },
      translationControl: {
        status: "completed",
        sourceLanguageLabel: "English",
        alternateMode: "original",
        canRequestAlternate: true,
      },
    };
  }

  return {
    sourceVersion: sourceVersionBySlugId[slugId],
    status: "available",
    mode: "original",
    content: {
      title: originalTitleBySlugId[slugId],
      bodyHtml: `<p>Original detail for ${slugId}.</p>`,
    },
    translationControl: {
      status: "not_requested",
      sourceLanguageLabel: "English",
      alternateMode: "translated",
      canRequestAlternate: true,
    },
  };
}

function refreshCandidateSet(): void {
  candidateSnapshot.value = createMaxDiffCandidateDisplaySnapshot({
    candidateSlugIds,
    itemBySlugId: liveItemBySlugId.value,
  });
}

function completeTranslation(): void {
  translationCompleted.value = true;
}

function resetScenario(): void {
  translationCompleted.value = false;
  refreshCandidateSet();
}

function openDialog(itemSlugId: string): void {
  dialogItemSlugId.value = itemSlugId;
  showDialog.value = true;
}

function noop(): void {
  // no-op for dev page callbacks
}

refreshCandidateSet();
</script>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
}

.section-card {
  border-radius: 1rem;
}

.section-title {
  font-size: 1.1rem;
  font-weight: var(--font-weight-semibold);
  color: $color-text-strong;
}

.section-copy {
  color: $color-text-weak;
  margin: 0.5rem 0 1rem;
}

.control-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.candidate-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.candidate-card {
  min-height: 9rem;
  border: 1px solid $color-border-weak;
  border-radius: 1rem;
  background: white;
  padding: 1rem;
  text-align: start;
  cursor: pointer;
}

.candidate-body {
  margin-top: 0.75rem;
  color: $color-text-weak;
}
</style>
