<template>
  <div>
    <div class="container">
      <ZKTab
        icon-code="meteor-icons:comment"
        :text="String(opinionCount)"
        :is-highlighted="model === 'comment'"
        :is-underlined="true"
        @click="clickedTab('comment')"
      />
      <ZKTab
        icon-code="ph:chart-donut"
        text="Analysis"
        :is-highlighted="model === 'analysis'"
        :is-underlined="true"
        @click="clickedTab('analysis')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import ZKTab from "src/components/ui-library/ZKTab.vue";

const model = defineModel({ required: true, type: String });
defineProps<{
  opinionCount: number;
}>();

function clickedTab(tabKey: "comment" | "analysis") {
  model.value = tabKey;
}
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
