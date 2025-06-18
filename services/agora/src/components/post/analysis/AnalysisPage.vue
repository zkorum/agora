<template>
  <div>
    <div class="container flexStyle">
      <ShortcutBar @clicked-shortcut="handleShortcut" />

      <div
        ref="meTabRef"
        class="tabComponent"
        :class="{ 'highlight-section': highlightedSection === 'me' }"
      >
        <MeTab />
      </div>

      <div
        ref="consensusTabRef"
        class="tabComponent"
        :class="{ 'highlight-section': highlightedSection === 'consensus' }"
      >
        <ConsensusTab />
      </div>

      <div
        ref="divisivenessTabRef"
        class="tabComponent"
        :class="{ 'highlight-section': highlightedSection === 'divisiveness' }"
      >
        <DivisivenessTab />
      </div>

      <div
        ref="opinionGroupTabRef"
        class="tabComponent"
        :class="{ 'highlight-section': highlightedSection === 'opinionGroup' }"
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
import DivisivenessTab from "./divisivenessTab/DivisivenessTab.vue";
import { ref } from "vue";

const props = defineProps<{
  polis: ExtendedConversationPolis;
  participantCount: number;
}>();

const meTabRef = ref<HTMLElement | null>(null);
const consensusTabRef = ref<HTMLElement | null>(null);
const divisivenessTabRef = ref<HTMLElement | null>(null);
const opinionGroupTabRef = ref<HTMLElement | null>(null);
const highlightedSection = ref<string | null>(null);

function scrollToElement(element: HTMLElement | null, sectionName: string) {
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
    case "Me":
      scrollToElement(meTabRef.value, "me");
      break;
    case "Consensus":
      scrollToElement(consensusTabRef.value, "consensus");
      break;
    case "Divisiveness":
      scrollToElement(divisivenessTabRef.value, "divisiveness");
      break;
    case "Opinion Groups":
      scrollToElement(opinionGroupTabRef.value, "opinionGroup");
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
