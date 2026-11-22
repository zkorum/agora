<template>
  <section class="qv-demo">
    <div class="demo-controls">
      <h2>Quadratic voting UI</h2>
      <p>Local-only preview inside the existing statement/analysis layout.</p>
      <div class="controls">
        <q-toggle
          v-model="allowOpposition"
          label="Allow opposition"
          @update:model-value="allocations = []"
        />
        <q-toggle v-model="closed" label="Closed" />
        <q-btn flat no-caps label="Reset preview" @click="reset" />
      </div>
    </div>
    <h3 class="conversation-title">Which improvements should come first?</h3>
    <PostActionBar
      v-model="tab"
      :compact-mode="false"
      :opinion-count="items.length"
      :participant-count="0"
      :vote-count="0"
      :total-participant-count="0"
      :total-vote-count="0"
      conversation-slug-id="qv-demo"
      conversation-title="Which improvements should come first?"
      author-username="preview-author"
      :on-same-tab-click="noop"
      :conversation-type-config="{
        conversationType: 'prioritizing',
        prioritizationType: 'qv',
        creditPricing: 'quadratic',
        allowOpposition,
      }"
      :enable-route-navigation="false"
    />
    <QvAllocationEditor
      v-if="tab === 'comment'"
      v-model="allocations"
      conversation-slug-id="qv-demo"
      :items="items"
      :allow-opposition="allowOpposition"
      :disabled="closed"
      :response-actions="undefined"
      @discard="showDiscard = true"
    />
    <QvAnalysisTab
      :can-edit-conversation="false"
      v-else
      :conversation-slug-id="undefined"
      :is-closed="closed"
      :on-view-items="
        () => {
          tab = 'comment';
        }
      "
    />
    <ZKConfirmDialog
      v-model="showDiscard"
      title="Discard preview changes?"
      message="No response has been saved."
      :actions="{
        cancel: { label: 'Keep editing', appearance: 'secondary-outlined' },
        confirm: { label: 'Discard changes', appearance: 'danger' },
      }"
      @confirm="allocations = []"
    />
  </section>
</template>

<script setup lang="ts">
import PostActionBar from "src/components/post/interactionBar/PostActionBar.vue";
import QvAllocationEditor from "src/components/post/qv/QvAllocationEditor.vue";
import QvAnalysisTab from "src/components/post/qv/QvAnalysisTab.vue";
import type { QvItem } from "src/components/post/qv/QvVoting.types";
import ZKConfirmDialog from "src/components/ui-library/ZKConfirmDialog.vue";
import type { QvAllocation } from "src/shared/utils/qv";
import { ref } from "vue";

const tab = ref<"comment" | "analysis">("comment");
const closed = ref(false);
const allowOpposition = ref(true);
const showDiscard = ref(false);
const allocations = ref<QvAllocation[]>([]);
const items: QvItem[] = [
  {
    slugId: "trees",
    title: "Plant shade trees along everyday walking routes.",
    body: "<p>Select streets through a shade survey and invite residents to identify difficult summer journeys. Keep pavements accessible and choose native species that suit the available space.</p><p>Share the planting plan before work starts so neighbours can raise concerns about sightlines, services or access.</p><p>Publish the final maintenance schedule and responsibility for watering throughout the first summer.</p>",
  },
  {
    slugId: "cycling",
    title: "Make the neighbourhood cycling routes safer.",
    body: "<p>Connect existing paths with safe crossings and protected cycling lanes.</p>",
  },
  {
    slugId: "library",
    title: "Extend the library’s weekend opening hours.",
    body: "<p>Open on Sundays so more residents can use the library.</p>",
  },
].map(({ slugId, title, body }, index) => ({
  slugId,
  displayContent: {
    sourceVersion: `00000000-0000-4000-8000-00000000000${index + 1}`,
    status: "available",
    mode: "original",
    content: { title, bodyHtml: body },
    translationControl: null,
  },
}));
function noop(): void {
  /* Display-only action bar. */
}
function reset(): void {
  allowOpposition.value = true;
  closed.value = false;
  allocations.value = [
    { itemId: "trees", votes: 7 },
    { itemId: "library", votes: -6 },
  ];
}
reset();
</script>

<style scoped lang="scss">
.qv-demo {
  padding: 1rem;
  border: 1px solid $sky-lighter;
  border-radius: 12px;
  background: white;
}
.demo-controls {
  margin-block-end: 1.5rem;
}
.demo-controls h2 {
  margin: 0;
  font-size: 1.2rem;
}
.demo-controls p {
  color: $ink-light;
  font-size: 0.875rem;
}
.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.conversation-title {
  font-size: 1.2rem;
  line-height: 1.4;
  margin-block: 1rem;
}
</style>
