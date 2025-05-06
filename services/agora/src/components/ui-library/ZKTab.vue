<template>
  <div class="textStyle" :class="{ highlightTab: isHighlighted }">
    {{ text }}
  </div>
</template>

<script setup lang="ts">
defineProps<{
  text: string;
  isHighlighted: boolean;
}>();
</script>

<style lang="scss" scoped>
.textStyle {
  cursor: pointer;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  padding-top: 0.3rem;
  padding-bottom: 0.3rem;
  font-weight: 500;
  color: #7d7a85;
  user-select: none;
}

.highlightTab {
  border-bottom: 3px solid;
  border-color: $primary;
  color: transparent;
  background-image: $gradient-hero;
  -webkit-background-clip: text;
  background-clip: text;
}
</style>
