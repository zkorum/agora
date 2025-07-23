<template>
  <OpinionGridLayout @click="showOpinionAnalysis">
    <template #content>
      <div class="consensusDescription">
        <ZKHtmlContent
          :html-body="props.opinionItem.opinion"
          :compact-mode="true"
          :enable-links="false"
        />
      </div>
    </template>

    <template #visualizer>
      <VoteCountVisualizer
        :vote-count1="opinionItemForVisualizer.numAgrees"
        :vote-count2="opinionItemForVisualizer.numPasses"
        :vote-count3="opinionItemForVisualizer.numDisagrees"
        :vote-count4="numNoVotesForVisualizer"
        :num-participants="opinionItemForVisualizer.numParticipants"
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
  opinionItem: OpinionItem;
  opinionItemForVisualizer: OpinionItem;
}>();

const numNoVotesForVisualizer = computed(
  () =>
    props.opinionItemForVisualizer.numParticipants -
    props.opinionItemForVisualizer.numAgrees -
    props.opinionItemForVisualizer.numPasses -
    props.opinionItemForVisualizer.numDisagrees
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
