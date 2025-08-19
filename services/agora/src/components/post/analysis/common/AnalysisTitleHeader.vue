<template>
  <div>
    <div class="container">
      <div class="title">
        <div v-if="showStarInTitle" :style="{ paddingTop: '0.2rem' }">
          <StaticIcon :src="starIcon" :size="'1rem'" />
        </div>
        <div>
          {{ props.title }}
        </div>
      </div>

      <slot name="action-button"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import StaticIcon from "src/components/features/ui/StaticIcon.vue";

const starIcon = process.env.VITE_PUBLIC_DIR + "images/icons/stars.svg";

const props = defineProps<{
  title: string;
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
</style>
