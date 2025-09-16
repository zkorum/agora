<template>
  <div>
    <div class="flexLayout">
      <q-icon :name="iconName" size="2rem" />

      <div class="coreText">
        <div class="title">
          {{ title }}
        </div>

        <div v-if="description.length > 0">
          {{ description }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
  iconName: string;
}>();
</script>

<style scoped lang="scss">
.flexLayout {
  display: flex;
  gap: 1rem;
}

.coreText {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.title {
  font-size: 1.2rem;
  font-weight: var(--font-weight-bold);
}
</style>
