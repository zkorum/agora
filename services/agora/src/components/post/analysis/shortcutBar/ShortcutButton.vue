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
  >
    <div>asdf</div>
  </Button>
</template>

<script setup lang="ts">
const props = defineProps<{
  isSelected: boolean;
}>();
</script>

<style lang="postcss" scoped>
.rootStyleSelected {
  background-color: #f1eeff;
  color: #6b4eff;
  border-radius: 10px;
  border-color: #6b4eff;
  border-style: solid;
  border-width: 1px;
  padding-top: 0.3rem;
  padding-bottom: 0.3rem;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.rootStyleUnselected {
  background-color: #f6f5f8;
  color: #6d6a74;
  border-radius: 10px;
  border-color: transparent;
  border-style: solid;
  border-width: 1px;
  padding-top: 0.3rem;
  padding-bottom: 0.3rem;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}
</style>
