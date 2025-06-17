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

      <div v-if="showChoice == 'infoButton'">Info button</div>
      <div v-if="showChoice == 'viewMore'">View more</div>
      <div v-if="showChoice == 'whatIsThis'">What is this</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import StaticIcon from "src/components/features/ui/StaticIcon.vue";

const props = defineProps<{
  title: string;
  showChoice: "infoButton" | "viewMore" | "whatIsThis";
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
  display: flex;
  gap: 1rem;
  align-items: center;
}
</style>
