<template>
  <div>
    <div class="container flexStyle">
      <ShortcutBar @clicked-shortcut="handleShortcut" />

      <div
        ref="summaryTabRef"
        class="tabComponent"
        :class="{ 'highlight-section': highlightedSection === 'Summary' }"
      >
        Summary placeholder
      </div>

      <div
        ref="meTabRef"
        class="tabComponent"
        :class="{ 'highlight-section': highlightedSection === 'Me' }"
      >
        <MeTab />
      </div>

      <div
        ref="consensusTabRef"
        class="tabComponent"
        :class="{ 'highlight-section': highlightedSection === 'Consensus' }"
      >
        <ConsensusTab />
      </div>

      <div
        ref="majorityTabRef"
        class="tabComponent"
        :class="{ 'highlight-section': highlightedSection === 'Majority' }"
      >
        Majority placeholder
      </div>

      <div
        ref="divisiveTabRef"
        class="tabComponent"
        :class="{ 'highlight-section': highlightedSection === 'Divisive' }"
      >
        <DivisiveTab />
      </div>

      <div
        ref="opinionGroupTabRef"
        class="tabComponent"
        :class="{
          'highlight-section': highlightedSection === 'Opinion Groups',
        }"
      >
        <OpinionGroupTab
          :polis="props.polis"
          :total-participant-count="props.participantCount"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ExtendedConversationPolis } from "src/shared/types/zod";
import OpinionGroupTab from "./opinionGroupTab/OpinionGroupTab.vue";
import ShortcutBar from "./shortcutBar/ShortcutBar.vue";
import { ShortcutItem } from "src/utils/component/analysis/shortcutBar";
import MeTab from "./meTab/meTab.vue";
import ConsensusTab from "./consensusTab/ConsensusTab.vue";
import DivisiveTab from "./divisiveTab/DivisiveTab.vue";
import { ref } from "vue";

const props = defineProps<{
  polis: ExtendedConversationPolis;
  participantCount: number;
}>();

const summaryTabRef = ref<HTMLElement | null>(null);
const meTabRef = ref<HTMLElement | null>(null);
const consensusTabRef = ref<HTMLElement | null>(null);
const majorityTabRef = ref<HTMLElement | null>(null);
const divisiveTabRef = ref<HTMLElement | null>(null);
const opinionGroupTabRef = ref<HTMLElement | null>(null);
const highlightedSection = ref<ShortcutItem | null>(null);

function scrollToElement(
  element: HTMLElement | null,
  sectionName: ShortcutItem
) {
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "center" });

    highlightedSection.value = sectionName;

    setTimeout(() => {
      highlightedSection.value = null;
    }, 2000);
  }
}

function handleShortcut(shortcutName: ShortcutItem) {
  switch (shortcutName) {
    case "Summary":
      scrollToElement(summaryTabRef.value, shortcutName);
      break;
    case "Me":
      scrollToElement(meTabRef.value, shortcutName);
      break;
    case "Consensus":
      scrollToElement(consensusTabRef.value, shortcutName);
      break;
    case "Majority":
      scrollToElement(majorityTabRef.value, shortcutName);
      break;
    case "Divisive":
      scrollToElement(divisiveTabRef.value, shortcutName);
      break;
    case "Opinion Groups":
      scrollToElement(opinionGroupTabRef.value, shortcutName);
      break;
    default:
      console.log("No matching component for shortcut:", shortcutName);
  }
}
</script>

<style lang="scss" scoped>
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

/* Style for all tab components */
.tabComponent {
  border-radius: 12px;
  padding: 0.5rem;
}

.highlight-section {
  background-color: rgba(237, 242, 247, 0.7);
}
</style>
