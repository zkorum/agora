<template>
  <button
    :class="{
      rootStyleSelected: props.isSelected,
      rootStyleUnselected: !props.isSelected,
    }"
    class="commonStyle"
    @click="$emit('click')"
  >
    <div>{{ label }}</div>
  </button>
</template>

<script setup lang="ts">
const props = defineProps<{
  isSelected: boolean;
  label: string;
}>();

defineEmits<{
  click: [];
}>();
</script>

<style lang="postcss" scoped>
.commonStyle {
  cursor: pointer;
  border-radius: 10px;
  border-style: solid;
  border-width: 1px;
  padding-top: 0.4rem;
  padding-bottom: 0.4rem;
  padding-left: 0.5rem;
  padding-right: 0.5rem;

  transition:
    background-color 0.3s ease,
    border-color 0.3s ease,
    color 0.3s ease;
}

.commonStyle:hover {
  background-color: #c6c4ff;
  border-color: #6b4eff;
  color: #6b4eff;
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
