<template>
  <div>
    <q-linear-progress :value="value" />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  currentStep: number;
  totalSteps: number;
}>();

const value = props.currentStep / props.totalSteps;
</script>

<style scoped lang="scss"></style>
