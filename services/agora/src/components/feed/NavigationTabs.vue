<template>
  <!-- TODO: ACCESSIBILITY - Change <div> to <button> element for keyboard accessibility and screen reader support -->
  <!-- Navigation tab should be keyboard navigable and have proper ARIA attributes for assistive technologies -->
  <div class="textStyle" :class="{
    highlightTab: isHighlighted,
    underlineTab: showUnderline && isHighlighted,
  }">
    {{ text }}
  </div>
</template>

<script setup lang="ts">
defineProps<{
  text: string;
  isHighlighted: boolean;
  showUnderline: boolean;
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
  color: transparent;
  background-image: $gradient-hero;
  -webkit-background-clip: text;
  background-clip: text;
}

.underlineTab {
  border-bottom: 3px solid;
  border-color: $primary;
}
</style>
