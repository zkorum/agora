<template>
  <div>
    <div class="container">
      <div>{{ props.title }}</div>
      <div v-if="showInfoButton">Info button</div>
      <div v-if="showViewMore">View more</div>
      <div v-if="showWhatIsThis">What is this</div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  title: string;
  showInfoButton: boolean;
  showViewMore: boolean;
  showWhatIsThis: boolean;
}>();
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}
</style>
