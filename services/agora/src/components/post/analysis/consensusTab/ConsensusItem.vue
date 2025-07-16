<template>
  <OpinionGridLayout @click="showOpinionAnalysis">
    <template #content>
      <div class="consensusDescription">
        <ZKHtmlContent
          :html-body="props.description"
          :compact-mode="true"
          :enable-links="false"
        />
      </div>
    </template>

    <template #visualizer>
      <VoteCountVisualizer
        :vote-count1="props.numAgree"
        :vote-count2="props.numPass"
        :vote-count3="props.numDisagree"
        :vote-count4="numNoVotes"
        label1="Agree"
        label2="Pass"
        label3="Disagree"
        label4="No Vote"
        :show-legend="false"
      />
    </template>
  </OpinionGridLayout>

  <OpinionAnalysisDialog
    v-model="showDialog"
    :conversation-slug-id="props.conversationSlugId"
    :opinion-item="props.opinionItem"
  />
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import VoteCountVisualizer from "../common/VoteCountVisualizer.vue";
import OpinionAnalysisDialog from "./OpinionAnalysisDialog.vue";
import OpinionGridLayout from "../common/OpinionGridLayout.vue";
import type { OpinionItem } from "src/shared/types/zod";
import ZKHtmlContent from "src/components/ui-library/ZKHtmlContent.vue";

const props = defineProps<{
  conversationSlugId: string;
  opinionSlugId: string;
  description: string;
  numAgree: number;
  numPass: number;
  numDisagree: number;
  numParticipants: number;
  opinionItem: OpinionItem;
}>();

const numNoVotes = computed(
  () =>
    props.numParticipants - props.numAgree - props.numPass - props.numDisagree
);

const showDialog = ref(false);

function showOpinionAnalysis() {
  showDialog.value = true;
}
</script>

<style lang="scss" scoped>
.consensusDescription {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  position: relative;
}
</style>
