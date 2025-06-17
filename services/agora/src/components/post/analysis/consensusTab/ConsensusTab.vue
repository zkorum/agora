<template>
  <div>
    <div>Common ground: What do people across all groups agree on?</div>

    <div
      v-for="consensusItem in consensusItemList"
      :key="consensusItem.description"
    >
      {{ consensusItem.description }}
    </div>
  </div>
</template>

<script setup lang="ts">
interface ConsensusItem {
  description: string;
  numAgree: number;
  numDisagree: number;
}

const consensusItemList: ConsensusItem[] = [
  {
    description: "Test1",
    numAgree: 100,
    numDisagree: 20,
  },
  {
    description: "Test2",
    numAgree: 100,
    numDisagree: 20,
  },
  {
    description: "Test3",
    numAgree: 100,
    numDisagree: 20,
  },
];
</script>

<style lang="scss" scoped></style>
