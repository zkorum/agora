<template>
  <div>
    <div class="container">
      <div class="title">{{ props.title }}</div>

      <div v-if="showChoice == 'infoButton'">Info button</div>
      <div v-if="showChoice == 'viewMore'">View more</div>
      <div v-if="showChoice == 'whatIsThis'">What is this</div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  title: string;
  showChoice: "infoButton" | "viewMore" | "whatIsThis";
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
}
</style>
