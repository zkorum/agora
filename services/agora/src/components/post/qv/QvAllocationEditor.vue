<template>
  <section class="qv-editor" :aria-label="t('title')">
    <header class="instructions">
      <p class="method-label">{{ t("title") }}</p>
      <h2>{{ t("instruction") }}</h2>
      <p>{{ t("explanation", { budget: CREDIT_VOTING_BUDGET }) }}</p>
      <p>{{ t(allowOpposition ? "signedHelp" : "supportOnlyHelp") }}</p>
      <div class="legend" aria-hidden="true">
        <span class="support">+ {{ t("support") }}</span>
        <span v-if="allowOpposition" class="not-support"
          >− {{ t("notSupport") }}</span
        >
      </div>
    </header>

    <div class="column-headings" aria-hidden="true">
      <span>{{ t("statement") }}</span>
      <span>{{ t("votes") }}</span>
      <span>{{ t("credits") }}</span>
    </div>
    <ol class="statement-list">
      <QvStatementVotingRow
        v-for="row in rows"
        :key="row.item.slugId"
        :conversation-slug-id="conversationSlugId"
        :item="row.item"
        :votes="row.votes"
        :can-decrease="row.canDecrease"
        :can-increase="row.canIncrease"
        @adjust="adjust({ itemId: row.item.slugId, delta: $event })"
      />
    </ol>

    <footer class="response-footer">
      <div class="budget-summary">
        <div class="balance-row">
          <span role="status" aria-live="polite" aria-atomic="true">{{
            t("remaining", { remaining, budget: CREDIT_VOTING_BUDGET })
          }}</span>
          <progress
            :value="remaining"
            :max="CREDIT_VOTING_BUDGET"
            :aria-label="t('credits')"
          />
        </div>
        <p>{{ t("unused") }}</p>
      </div>
      <PrimeButton
        :label="t(responseActions?.retrying ? 'retryCommand' : 'save')"
        :disabled="responseActions === undefined || !responseActions.canSave"
        :loading="responseActions?.saving ?? false"
        :aria-describedby="savingNoticeId"
        @click="emit('save')"
      />
    </footer>
    <p :id="savingNoticeId" class="availability-note">
      {{
        t(
          responseActions === undefined
            ? "savingUnavailable"
            : responseActions.hasSaved
              ? "savedBaseline"
              : "notSaved"
        )
      }}
    </p>
    <PrimeButton
      v-if="responseActions?.hasSaved"
      :label="t('withdraw')"
      severity="danger"
      text
      :disabled="!responseActions.canWithdraw"
      @click="emit('withdraw')"
    />
    <div
      v-if="responseActions?.dirty ?? allocations.length > 0"
      class="unsaved-banner"
      role="status"
    >
      <div>
        <strong>{{ t("unsaved") }}</strong>
        <p>{{ t("localOnly") }}</p>
      </div>
      <PrimeButton
        :label="t('discard')"
        severity="secondary"
        text
        :disabled="responseActions !== undefined && !responseActions.canDiscard"
        @click="emit('discard')"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  CREDIT_VOTING_BUDGET,
  parseQvBallot,
  type QvAllocation,
  qvCreditsToChangeVote,
} from "src/shared/utils/qv";
import { computed, useId } from "vue";

import QvStatementVotingRow from "./QvStatementVotingRow.vue";
import { qvVotingTranslations } from "./QvVoting.i18n";
import type { QvResponseActions, QvStatement } from "./QvVoting.types";

const props = defineProps<{
  conversationSlugId: string;
  items: readonly QvStatement[];
  allowOpposition: boolean;
  disabled: boolean;
  responseActions: QvResponseActions | undefined;
}>();
const emit = defineEmits<{ discard: []; save: []; withdraw: [] }>();
const allocations = defineModel<QvAllocation[]>({ required: true });
const { t } = useComponentI18n(qvVotingTranslations);
const savingNoticeId = useId();
const votesById = computed(
  () => new Map(allocations.value.map(({ itemId, votes }) => [itemId, votes]))
);
const itemIds = computed(() => new Set(props.items.map((item) => item.slugId)));
const ballot = computed(() =>
  parseQvBallot({
    allocations: allocations.value,
    config: { allowNegativeVotes: props.allowOpposition },
  })
);
const hasValidAllocations = computed(
  () =>
    ballot.value.valid &&
    allocations.value.every(({ itemId }) => itemIds.value.has(itemId))
);
const remaining = computed(
  () =>
    CREDIT_VOTING_BUDGET -
    allocations.value.reduce(
      (total, allocation) => total + allocation.votes ** 2,
      0
    )
);
const rows = computed(() =>
  props.items.map((item) => ({
    item,
    votes: votesFor(item.slugId),
    canDecrease: canAdjust({ itemId: item.slugId, delta: -1 }),
    canIncrease: canAdjust({ itemId: item.slugId, delta: 1 }),
  }))
);

function votesFor(itemId: string): number {
  return votesById.value.get(itemId) ?? 0;
}
function nextAllocation({
  itemId,
  delta,
}: {
  itemId: string;
  delta: -1 | 1;
}): QvAllocation[] {
  const votes = votesFor(itemId) + delta;
  const others = allocations.value.filter(
    (allocation) => allocation.itemId !== itemId
  );
  return votes === 0 ? others : [...others, { itemId, votes }];
}
function canAdjust(change: { itemId: string; delta: -1 | 1 }): boolean {
  const currentVotes = votesFor(change.itemId);
  const nextVotes = currentVotes + change.delta;
  return (
    !props.disabled &&
    hasValidAllocations.value &&
    itemIds.value.has(change.itemId) &&
    (props.allowOpposition || nextVotes >= 0) &&
    qvCreditsToChangeVote({ currentVotes, nextVotes }) <= remaining.value
  );
}
function adjust(change: { itemId: string; delta: -1 | 1 }): void {
  if (canAdjust(change)) allocations.value = nextAllocation(change);
}
</script>

<style scoped lang="scss">
.qv-editor {
  container-type: inline-size;
  color: $ink-dark;
}
.instructions {
  display: grid;
  gap: 0.5rem;
  padding-block: 1rem 1.5rem;
}
p,
h2 {
  margin: 0;
}
h2 {
  font-size: 1.1rem;
  line-height: 1.4;
  font-weight: var(--font-weight-semibold);
}
.instructions p,
.budget-summary p,
.availability-note {
  color: $ink-light;
  font-size: 0.875rem;
  line-height: 1.5;
}
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.875rem;
  font-weight: var(--font-weight-medium);
}
.support {
  color: $green-darkest;
}
.not-support {
  color: $negative;
}
.column-headings {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 9rem 4.5rem;
  gap: 1rem;
  align-items: center;
  padding-block: 0.75rem;
  color: $ink-light;
  font-size: 0.75rem;
}
.column-headings span:not(:first-child) {
  text-align: center;
}
.statement-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.response-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-block: 1.5rem 0.75rem;
  border-block-start: 1px solid $sky-lighter;
}
.budget-summary {
  display: grid;
  gap: 0.375rem;
}
.balance-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
}
progress {
  appearance: none;
  inline-size: 5rem;
  block-size: 6px;
  border: 0;
  border-radius: 999px;
  overflow: hidden;
  background: $sky-lighter;
}
progress::-webkit-progress-bar {
  background: $sky-lighter;
}
progress::-webkit-progress-value {
  background: $green-base;
  border-radius: 999px;
}
progress::-moz-progress-bar {
  background: $green-base;
  border-radius: 999px;
}
.availability-note {
  padding-block-end: 1rem;
}
.unsaved-banner {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: $app-background-color;
  border-radius: 8px;
  font-size: 0.875rem;
}
.unsaved-banner p {
  margin-block-start: 0.25rem;
  color: $ink-light;
}
@container (max-width: 560px) {
  .column-headings {
    display: none;
  }
}
</style>
