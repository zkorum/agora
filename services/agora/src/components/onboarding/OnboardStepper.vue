<template>
  <div>
    <ProgressBar :value="value" :show-value="false" />
  </div>
</template>

<script setup lang="ts">
import ProgressBar from "primevue/progressbar";

const props = defineProps<{
  currentStep: number;
  totalSteps: number;
}>();

const value = (props.currentStep / props.totalSteps) * 100;
</script>

<style scoped lang="scss"></style>
