<template>
  <div>
    <div class="container">
      <div class="title">
        <div v-if="showStarInTitle" :style="{ paddingTop: '0.2rem' }">
          <StaticIcon :src="'/images/icons/stars.svg'" :size="'1rem'" />
        </div>
        <div>
          {{ props.title }}
        </div>
      </div>

      <button
        v-if="showChoice == 'infoButton'"
        class="choice-button"
        @click.stop
      >
        <i class="pi pi-info-circle" :style="{ color: '#6D6A74' }"></i>
      </button>
      <button v-if="showChoice == 'viewMore'" class="choice-button" @click.stop>
        View more
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import StaticIcon from "src/components/features/ui/StaticIcon.vue";
import { AnalysisTabActionButton } from "src/utils/component/analysis/analysisTypes";

const props = defineProps<{
  title: string;
  showChoice: AnalysisTabActionButton;
  showStarInTitle: boolean;
}>();
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
}

.title {
  font-weight: 500;
  font-size: 1rem;
  color: #0a0714;
  display: flex;
  gap: 1rem;
  align-items: center;
}

.choice-button {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #6d6a74;
  border-radius: 4px;
  transition: background-color 0.2s;
  white-space: nowrap;
  height: 2rem;
  display: flex;
  align-items: center;

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
}
</style>
