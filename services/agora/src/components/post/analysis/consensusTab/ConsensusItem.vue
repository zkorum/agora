<template>
  <div class="consensusItemStyle">
    <div class="descriptionReadMoreContainer">
      <div
        :ref="(el) => saveElementRef(consensusItem.id, el)"
        class="consensusDescription"
      >
        {{ consensusItem.description }}
      </div>

      <div v-if="hasOverflow(consensusItem.id)" class="readMore">Read more</div>
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

<script setup lang="ts">
import { defineProps } from "vue";
import VoteCountVisualizer from "../common/VoteCountVisualizer.vue";
import { useElementOverflow } from "src/utils/ui/useElementOverflow";
import { ConsensusItemData } from "src/utils/component/analysis/analysisTypes";

defineProps<{
  consensusItem: ConsensusItemData;
}>();

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
}

.readMore {
  color: #9a97a4;
  font-weight: 500;
  white-space: nowrap;
  background: none;
  border: none;
  border-radius: 4px;
  padding: 0px 8px;
  text-align: center;
  font-size: 0.9rem;
}

.descriptionReadMoreContainer {
  display: flex;
  flex-direction: column;
  align-items: end;
  gap: 0.2rem;
}
</style>
