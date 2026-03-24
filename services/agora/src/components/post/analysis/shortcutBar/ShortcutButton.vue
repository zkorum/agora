<template>
  <SpaLink
    v-if="to"
    :to="to"
    :deferred="true"
    :class="{
      rootStyleSelected: props.isSelected,
      rootStyleUnselected: !props.isSelected,
    }"
    class="commonStyle"
  >
    <div>{{ label }}</div>
  </SpaLink>
  <button
    v-else
    :class="{
      rootStyleSelected: props.isSelected,
      rootStyleUnselected: !props.isSelected,
    }"
    class="commonStyle"
  >
    <div>{{ label }}</div>
  </button>
</template>

<script setup lang="ts">
import SpaLink from "src/components/ui-library/SpaLink.vue";
import type { RouteLocationRaw } from "vue-router";

const props = defineProps<{
  isSelected: boolean;
  label: string;
  to?: RouteLocationRaw;
}>();
</script>

<style lang="postcss" scoped>
.commonStyle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border-style: solid;
  border-width: 1px;
  padding-top: 0.4rem;
  padding-bottom: 0.4rem;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  cursor: pointer;
  user-select: none;
  text-decoration: none;
  background: none;
  font: inherit;
}

.commonStyle:hover {
  background-color: #c6c4ff;
  border-color: #6b4eff;
  color: #6b4eff;
}

.commonStyle:focus-visible {
  outline: 2px solid #6b4eff;
  outline-offset: 2px;
}

.rootStyleSelected {
  background-color: #f1eeff;
  color: #6b4eff;
  border-color: #6b4eff;
}

.rootStyleUnselected {
  background-color: #f6f5f8;
  color: #6d6a74;
  border-color: transparent;
}
</style>
