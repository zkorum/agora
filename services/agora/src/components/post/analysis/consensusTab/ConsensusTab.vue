<template>
  <div>
    <AnalysisSectionWrapper>
      <template #header>
        <AnalysisTitleHeader
          :show-star-in-title="false"
          title="Common ground: What do people across all groups agree on?"
          :show-choice="'viewMore'"
        />
      </template>

      <template #body>
        <div
          v-for="consensusItem in consensusItemList"
          :key="consensusItem.description"
          class="consensusItemStyle"
        >
          <div class="descriptionReadMoreContainer">
            <div
              :ref="(el) => saveElementRef(consensusItem.id, el)"
              class="consensusDescription"
              :class="{ expanded: consensusItem.isDescriptionExpanded }"
            >
              {{ consensusItem.description }}
            </div>

            <button
              v-if="
                hasOverflow(consensusItem.id) ||
                consensusItem.isDescriptionExpanded
              "
              class="readMore"
              @click.stop="
                consensusItem.isDescriptionExpanded =
                  !consensusItem.isDescriptionExpanded
              "
            >
              {{
                consensusItem.isDescriptionExpanded ? "Read less" : "Read more"
              }}
            </button>
          </div>

          <div>
            <VoteCountVisualizer
              :vote-count1="65"
              :vote-count2="20"
              :vote-count3="10"
              :vote-count4="10"
              label1="Agree"
              label2="Pass"
              label3="Disagree"
              label4="No Vote"
              :show-legend="false"
            />
          </div>
        </div>
      </template>
    </AnalysisSectionWrapper>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import AnalysisSectionWrapper from "../common/AnalysisSectionWrapper.vue";
import AnalysisTitleHeader from "../common/AnalysisTitleHeader.vue";
import VoteCountVisualizer from "../common/VoteCountVisualizer.vue";
import { useElementOverflow } from "src/utils/ui/useElementOverflow";

interface ConsensusItem {
  id: number;
  description: string;
  numAgree: number;
  numDisagree: number;
  isDescriptionExpanded: boolean;
}

const dummyDescription =
  " Bringing unlocked me an striking ye perceive. Mr by wound hours oh happy. Me in resolution pianoforte continuing we. Most my no spot felt by no. He he in forfeited furniture sweetness he arranging. Me tedious so to behaved written account ferrars moments. Too objection for elsewhere her preferred allowance her. Marianne shutters mr steepest to me. Up mr ignorant produced distance although is sociable blessing. Ham whom call all lain like.";

const consensusItemList = ref<ConsensusItem[]>([
  {
    id: 1,
    description:
      "Bringing unlocked me an striking ye perceive. Mr by wound hours oh happy. Me in resolution pianoforte continuing we. Most my no spot felt by no. He he",
    numAgree: 100,
    numDisagree: 20,
    isDescriptionExpanded: false,
  },
  {
    id: 2,
    description: dummyDescription,
    numAgree: 100,
    numDisagree: 20,
    isDescriptionExpanded: false,
  },
  {
    id: 3,
    description: dummyDescription,
    numAgree: 100,
    numDisagree: 20,
    isDescriptionExpanded: false,
  },
]);

// Use the element overflow composable
const { saveElementRef, hasOverflow } = useElementOverflow();
</script>

<style lang="scss" scoped>
.consensusItemStyle {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
}

.consensusDescription {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  position: relative;

  &.expanded {
    -webkit-line-clamp: unset;
    line-clamp: 3;
    display: block;
  }
}

.readMore {
  color: #9a97a4;
  cursor: pointer;
  font-weight: 500;
  white-space: nowrap;
  background: none;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  text-align: center;
  font-size: 0.9rem;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(154, 151, 164, 0.15);
    color: #6c6980;
  }

  &:active {
    transform: translateY(1px);
  }
}

.descriptionReadMoreContainer {
  display: flex;
  flex-direction: column;
  align-items: end;
  gap: 0.2rem;
}
</style>
