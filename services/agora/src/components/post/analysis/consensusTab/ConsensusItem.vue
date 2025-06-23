<template>
  <OpinionGridLayout @click="showOpinionAnalysis">
    <template #content>
      <div class="descriptionReadMoreContainer">
        <div
          :ref="(el) => saveElementRef(props.id, el)"
          class="consensusDescription"
        >
          {{ props.description }}
        </div>

        <div v-if="hasOverflow(props.id)" class="readMore">Read more</div>
      </div>
    </template>

    <template #visualizer>
      <VoteCountVisualizer
        :vote-count1="props.numAgree"
        :vote-count2="props.numPass"
        :vote-count3="props.numDisagree"
        :vote-count4="props.numNoVote"
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
    :opinion-data="opinionAnalysisData"
  />
</template>

<script setup lang="ts">
import { ref } from "vue";
import VoteCountVisualizer from "../common/VoteCountVisualizer.vue";
import { useElementOverflow } from "src/utils/ui/useElementOverflow";
import { OpinionAnalysisData } from "src/utils/component/analysis/analysisTypes";
import OpinionAnalysisDialog from "./OpinionAnalysisDialog.vue";
import OpinionGridLayout from "../common/OpinionGridLayout.vue";

const props = defineProps<{
  id: number;
  description: string;
  numAgree: number;
  numPass: number;
  numDisagree: number;
  numNoVote: number;
}>();

// Use the element overflow composable
const { saveElementRef, hasOverflow } = useElementOverflow();

// Dialog control
const showDialog = ref(false);

// Sample opinion analysis data - in a real app, this would come from an API or props
const opinionAnalysisData = ref<OpinionAnalysisData>({
  username: "SamJ",
  opinionText:
    "Not necessarily Europe but the values it represents must live on. That means Human Rights, freedom of speech (not freedom of hate). Europe treats its own people well, not necessarily other countries. For the sake of humanity we must protect Europe with or without US support.",
  groups: [
    {
      name: "Fiscal Reformists",
      agree: 172,
      disagree: 1,
    },
    {
      name: "Geopolitical Realists",
      agree: 1,
      disagree: 82,
    },
  ],
});

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

.readMore {
  color: #9a97a4;
  font-weight: 500;
  white-space: nowrap;
  border-radius: 4px;
  padding: 0 8px;
  text-align: right;
  font-size: 0.9rem;
}

.descriptionReadMoreContainer {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
</style>
