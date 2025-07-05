<template>
  <div>
    <div class="container">
      <ZKTab
        icon-code="meteor-icons:comment"
        :text="String(opinionCount)"
        :is-highlighted="model === 'comment' && !compactMode"
        :should-underline-on-highlight="true"
        @click="clickedTab('comment')"
      />
      <ZKTab
        v-if="!compactMode && showAnalysisPage"
        icon-code="ph:chart-donut"
        text="Analysis"
        :is-highlighted="model === 'analysis'"
        :should-underline-on-highlight="true"
        @click="clickedTab('analysis')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import ZKTab from "src/components/ui-library/ZKTab.vue";

const model = defineModel<"comment" | "analysis">({ required: true });
const props = defineProps<{
  opinionCount: number;
  compactMode: boolean;
  showAnalysisPage: boolean;
}>();

function clickedTab(tabKey: "comment" | "analysis") {
  if (!props.compactMode) {
    model.value = tabKey;
  }
}
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
