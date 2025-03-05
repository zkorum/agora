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
  padding-left: 8px;
  padding-right: 8px;
  padding-top: 6px;
  padding-bottom: 6px;
  font-weight: 500;
  color: #7d7a85;
  user-select: none;
}

.highlightTab {
  border-bottom: 3px solid;
  border-color: $primary;
  background-image: $gradient-hero;
  color: transparent;
  background-clip: text;
}
</style>
