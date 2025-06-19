<template>
  <div>
    <div class="container flexStyle">
      <ShortcutBar @clicked-shortcut="handleShortcut" />

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
        <AnalysisTabBase
          title="Common ground: What do people across all groups agree on?"
          :item-list="consensusItemList"
          show-choice="viewMore"
          :show-star-in-title="false"
        />
      </div>

      <div
        ref="majorityTabRef"
        class="tabComponent"
        :class="{ 'highlight-section': highlightedSection === 'Majority' }"
      >
        <AnalysisTabBase
          title="What do most people agree on?"
          :item-list="majorityItemList"
          show-choice="viewMore"
          :show-star-in-title="false"
        />
      </div>

      <div
        ref="divisiveTabRef"
        class="tabComponent"
        :class="{ 'highlight-section': highlightedSection === 'Divisive' }"
      >
        <AnalysisTabBase
          title="What is most divisive?"
          :item-list="divisiveItemList"
          show-choice="viewMore"
          :show-star-in-title="false"
        />
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
import AnalysisTabBase from "./common/AnalysisTabBase.vue";
import { ref } from "vue";
import { ConsensusItemData } from "src/utils/component/analysis/analysisTypes";

const props = defineProps<{
  polis: ExtendedConversationPolis;
  participantCount: number;
}>();

const dummyDescription =
  "Bringing unlocked me an striking ye perceive. Mr by wound hours oh happy. Me in resolution pianoforte continuing we. Most my no spot felt by no. He he in forfeited furniture sweetness he arranging. Me tedious so to behaved written account ferrars moments.";

const consensusItemList = ref<ConsensusItemData[]>([
  {
    id: 1,
    description:
      "Bringing unlocked me an striking ye perceive. Mr by wound hours oh happy. Me in resolution pianoforte continuing we. Most my no spot felt by no. He he",
    numAgree: 100,
    numDisagree: 20,
  },
  {
    id: 2,
    description: dummyDescription,
    numAgree: 100,
    numDisagree: 20,
  },
  {
    id: 3,
    description: dummyDescription,
    numAgree: 100,
    numDisagree: 20,
  },
]);

const majorityItemList = ref<ConsensusItemData[]>([
  {
    id: 1,
    description: "Most people agree that education is important",
    numAgree: 85,
    numDisagree: 5,
  },
  {
    id: 2,
    description: "Healthcare should be accessible to everyone",
    numAgree: 80,
    numDisagree: 10,
  },
  {
    id: 3,
    description: "Environmental protection is a priority",
    numAgree: 75,
    numDisagree: 15,
  },
]);

const divisiveItemList = ref<ConsensusItemData[]>([
  {
    id: 1,
    description: "Tax policy should prioritize economic growth",
    numAgree: 50,
    numDisagree: 50,
  },
  {
    id: 2,
    description: "Government regulation of businesses should be increased",
    numAgree: 45,
    numDisagree: 55,
  },
  {
    id: 3,
    description: "Social media has a positive impact on society",
    numAgree: 48,
    numDisagree: 52,
  },
]);

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
