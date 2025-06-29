<template>
  <Button
    rounded
    :pt="{
      root: {
        class: 'generalStyle borderColorOn',
      },
    }"
    class="followingStyle"
  >
    <div class="button-content gradientText">
      <span>{{ label }}</span>
      <i
        v-if="icon"
        :class="icon"
        :style="{
          fontSize: '1rem',
          color: '#6b4eff',
        }"
      />
    </div>
  </Button>
</template>

<script setup lang="ts">
import Button from "primevue/button";

defineProps<{
  label: string;
  icon?: string;
}>();
</script>

<style lang="scss" scoped>
.button-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.gradientText {
  background: linear-gradient(
    to bottom,
    #6b4eff,
    #4f92f6
  ); /* Gradient from one color to another */
  background-clip: text; /* Clip the background to fit the text */
  -webkit-background-clip: text;
  color: transparent; /* Make the text color transparent */
  -webkit-text-fill-color: transparent;
}

.generalStyle {
  font-weight: 500;
  font-size: 1rem;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  padding-left: 1rem;
  padding-right: 1rem;
  border-radius: 10px;
}

.borderColorOn {
  border-color: #6b4eff;
}

.followingStyle {
  background-color: #f1eeff;
}

.followingStyle:hover {
  background-color: #c6c4ff !important;
  border-color: #6b4eff !important;
}
</style>
