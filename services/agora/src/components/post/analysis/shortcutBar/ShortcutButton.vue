<template>
  <Button
    variant="outlined"
    rounded
    :pt="{
      root: {
        class: '',
      },
    }"
    :class="{
      rootStyleSelected: props.isSelected,
      rootStyleUnselected: !props.isSelected,
    }"
    class="commonStyle"
  >
    <div>{{ label }}</div>
  </Button>
</template>

<script setup lang="ts">
import Button from "primevue/button";

const props = defineProps<{
  isSelected: boolean;
  label: string;
}>();
</script>

<style lang="postcss" scoped>
.commonStyle {
  border-radius: 10px;
  border-style: solid;
  border-width: 1px;
  padding-top: 0.4rem;
  padding-bottom: 0.4rem;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.commonStyle:hover {
  cursor: pointer;
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
