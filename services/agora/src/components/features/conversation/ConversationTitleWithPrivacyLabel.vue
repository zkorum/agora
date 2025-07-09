<template>
  <div class="title-section">
    <div v-if="isPrivate" class="privacy-label">Private</div>
    <h1 class="conversation-title">{{ title }}</h1>
  </div>
</template>

<script setup lang="ts">
interface Props {
  isPrivate: boolean;
  title: string;
}

defineProps<Props>();
</script>

<style scoped lang="scss">
.title-section {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.privacy-label {
  background-color: #333;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 5px;
  font-size: 0.8rem;
  font-weight: 600;
  width: fit-content;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 0.3rem;
}

.conversation-title {
  font-size: 1.2rem;
  font-weight: 500;
  color: #0a0714;
  line-height: 1.3;
}
</style>
